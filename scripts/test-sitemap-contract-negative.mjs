#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'src/pages/sitemap.astro'), 'utf8');
const helperSource = fs.readFileSync(path.join(root, 'src/lib/sitemap-entries.mjs'), 'utf8');
const validator = path.join(root, 'scripts/validate-sitemap-contract.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-contract-negative-'));

const cases = [
  ['category source reintroduced', (route, helper) => [route.replace('listPages }', 'listPages, listCategories }'), helper], 'forbidden sitemap content source: listCategories'],
  ['author source reintroduced', (route, helper) => [route.replace('listPages }', 'listPages, listUsers }'), helper], 'forbidden sitemap content source: listUsers'],
  ['non-page section reintroduced', (route, helper) => [route, helper.replace("{ heading: 'Posts', items: postItems },", "{ heading: 'Posts', items: postItems },\n    { heading: 'Categories', items: [] },")], 'exact published page/post allowlist'],
  ['draft page included', (route, helper) => [route, helper.replace('.filter(isPublished)\n    .filter((page)', '.filter((page)')], 'exact published page/post allowlist'],
  ['system page included', (route, helper) => [route, helper.replace("    .filter((page) => !['404', 'sitemap'].includes(String(page?._sys?.filename || '').toLowerCase()))\n", '')], 'exact published page/post allowlist'],
  ['draft post included', (route, helper) => [route, helper.replace('  const postItems = posts\n    .filter(isPublished)\n', '  const postItems = posts\n')], 'exact published page/post allowlist'],
  ['content scope marker removed', (route, helper) => [route.replace("    $('[data-dc-tpl=\"45\"]').first().attr('data-sitemap-content', '');\n", ''), helper], 'missing sitemap route contract'],
  ['unused template content retained', (route, helper) => [route.replace('replaceAllContent: true', 'replaceAllContent: false'), helper], 'missing sitemap route contract: replaceAllContent: true'],
];

for (const [name, mutate, expected] of cases) {
  const [route, helper] = mutate(routeSource, helperSource);
  const routePath = path.join(tmp, `${name.replaceAll(' ', '-')}.astro`);
  const helperPath = path.join(tmp, `${name.replaceAll(' ', '-')}.mjs`);
  fs.writeFileSync(routePath, route);
  fs.writeFileSync(helperPath, helper);
  const result = spawnSync(process.execPath, [validator], {
    cwd: root,
    env: { ...process.env, SITEMAP_ROUTE: routePath, SITEMAP_HELPER: helperPath },
    encoding: 'utf8',
  });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status === 0 || !output.includes(expected)) {
    throw new Error(`${name} controlled negative failed: ${output}`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`SITEMAP_CONTENT_CONTRACT_NEGATIVE_PASS ${cases.length}`);
