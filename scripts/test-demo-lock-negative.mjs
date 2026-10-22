#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const cases = [
  { mutation: 'route-status', expected: 'route-status:/:expected-418:got-200' },
  { mutation: 'route-family', expected: 'route-family:/:expected-broken-index:got-index' },
  { mutation: 'dynamic-input', expected: 'dynamic-input-not-rendered:INTENTIONAL-MISSING-MARKER' },
  { mutation: 'dom-structure', expected: 'route-template-structure:/privacy-policy/:expected-64:got-63' },
];
const results = [];
for (let index = 0; index < cases.length; index += 1) {
  const item = cases[index];
  const run = spawnSync(process.execPath, ['scripts/validate-demo-lock.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, DEMO_LOCK_MUTATION: item.mutation, DEMO_LOCK_PORT: String(4390 + index) },
    encoding: 'utf8',
    timeout: 180000,
  });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  if (run.error || run.status === 0 || !output.includes(item.expected)) {
    console.error(`ASTRO_DEMO_LOCK_NEGATIVE_FAIL ${item.mutation} exit=${run.status} expected=${item.expected}`);
    if (run.error) console.error(run.error.message);
    console.error(output.slice(-2000));
    process.exit(1);
  }
  results.push({ mutation: item.mutation, rejected: true, exit: run.status });
  console.log(`ASTRO_DEMO_LOCK_NEGATIVE_PASS ${item.mutation}`);
}
console.log(JSON.stringify({ schema: 'commercial-demo-lock-negative-v1', serial: true, results }, null, 2));
console.log(`ASTRO_DEMO_LOCK_NEGATIVE_OK ${results.length}`);
