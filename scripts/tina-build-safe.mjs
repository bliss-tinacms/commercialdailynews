#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { sanitizeGeneratedClient } from './sanitize-generated-client.mjs';

const local = process.argv.includes('--local');
const runTina = (args, env = process.env) => spawnSync('pnpm', ['exec', 'tinacms', ...args], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});
const runAstro = (env = process.env) => spawnSync('pnpm', ['exec', 'astro', 'build'], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});
const withoutTinaTokens = (source) => {
  const env = { ...source };
  for (const key of Object.keys(env)) {
    if (/TINA/i.test(key) && /TOKEN/i.test(key)) delete env[key];
  }
  return env;
};

let status = 1;
try {
  if (local) {
    status = runTina(['build', '--local', '--skip-cloud-checks', '--noTelemetry', '-c', 'astro build']).status ?? 1;
  } else {
    // First prove the real Cloud schema with the protected content token. Astro is
    // deliberately not run in this phase because Vite would inline that token.
    const cloudEnv = { ...process.env, TINA_DIRECT_CLOUD_CHECK: '1' };
    const cloudCheck = runTina(['build', '--noTelemetry', '-c', 'node --version'], cloudEnv);
    if ((cloudCheck.status ?? 1) !== 0) {
      status = cloudCheck.status ?? 1;
    } else {
      sanitizeGeneratedClient();
      const publicEnv = withoutTinaTokens(process.env);
      // Regenerate the deployed same-origin-proxy admin without any token alias,
      // sanitize again, then build Astro in a separate token-free process.
      const adminBuild = runTina(['build', '--skip-cloud-checks', '--noTelemetry', '-c', 'node --version'], publicEnv);
      if ((adminBuild.status ?? 1) !== 0) {
        status = adminBuild.status ?? 1;
      } else {
        sanitizeGeneratedClient();
        status = runAstro(publicEnv).status ?? 1;
      }
    }
  }
} finally {
  sanitizeGeneratedClient();
}
process.exit(status);
