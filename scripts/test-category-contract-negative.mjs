#!/usr/bin/env node
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const root = resolve(new URL('..', import.meta.url).pathname);
const validator = join(root, 'scripts/validate-category-contract.mjs');
const fixtureFiles = [
  'src/lib/permalinks.ts',
  'src/lib/commercial-renderers.ts',
  'src/pages/[...slug].astro',
  'src/pages/category/[...slug].astro',
  'src/pages/blog/category/[...slug].astro',
  'tina/collections/category.ts',
  'package.json',
  '.github/workflows/category-contract.yml',
];
const fixtureDirs = ['src/content/navigation', 'src/content/category'];

function prepareFixture() {
  const fixture = mkdtempSync(join(tmpdir(), 'commercial-category-contract-'));
  for (const relativePath of fixtureFiles) {
    const target = join(fixture, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(root, relativePath), target);
  }
  for (const relativeDir of fixtureDirs) cpSync(join(root, relativeDir), join(fixture, relativeDir), { recursive: true });
  return fixture;
}

function mutate(fixture, relativePath, oldText, newText) {
  const path = join(fixture, relativePath);
  const source = readFileSync(path, 'utf8');
  if (!source.includes(oldText)) throw new Error(`mutation-source-missing:${relativePath}:${oldText}`);
  writeFileSync(path, source.replace(oldText, newText));
}

const positive = spawnSync(process.execPath, [validator, '--root', root], { encoding: 'utf8' });
if (positive.status !== 0 || !positive.stdout.includes('CATEGORY_CONTRACT_PASS')) {
  process.stderr.write(positive.stdout + positive.stderr);
  throw new Error('positive-category-contract-did-not-pass');
}

const cases = [
  {
    name: 'prefix-permalink-helper',
    expected: 'category-permalink-not-prefix-free',
    apply: (fixture) => mutate(fixture, 'src/lib/permalinks.ts', 'return slug ? "/" + slug + "/" : "/";', 'return slug ? "/category/" + slug + "/" : "/category/";'),
  },
  {
    name: 'prefix-tina-router',
    expected: 'tina-category-router-not-prefix-free',
    apply: (fixture) => mutate(fixture, 'tina/collections/category.ts', 'return `/${String(document._sys.filename', 'return `/category/${String(document._sys.filename'),
  },
  {
    name: 'prefix-archive-route',
    expected: 'category-archive-prefix-reintroduced',
    apply: (fixture) => mutate(fixture, 'src/pages/[...slug].astro', 'categoryPage > 1 ? `/${categoryRouteSlug}/page/${categoryPage}/` : `/${categoryRouteSlug}/`', 'categoryPage > 1 ? `/category/${categoryRouteSlug}/page/${categoryPage}/` : `/category/${categoryRouteSlug}/`'),
  },
  {
    name: 'prefix-navigation-or-generated-link',
    expected: 'navigation-category-prefix:',
    apply: (fixture) => mutate(fixture, 'src/content/navigation/header.json', '"href": "/business-economy/"', '"href": "/category/business-economy/"'),
  },
  {
    name: 'prefix-canonical-or-sitemap',
    expected: 'category-canonical-prefix:',
    apply: (fixture) => mutate(fixture, 'src/content/category/business-economy.json', '"canonicalUrl": "/business-economy/"', '"canonicalUrl": "/category/business-economy/"'),
  },
  {
    name: 'legacy-alias-not-301',
    expected: 'legacy-category-route-does-not-redirect-prefix-free',
    apply: (fixture) => mutate(fixture, 'src/pages/category/[...slug].astro', 'Astro.redirect(`/${slug}/`, 301)', 'Astro.redirect(`/${slug}/`, 302)'),
  },
  {
    name: 'first-category-only',
    expected: 'article-multicategory-renderer-missing:categories.slice(1).forEach',
    apply: (fixture) => mutate(fixture, 'src/lib/commercial-renderers.ts', 'categories.slice(1).forEach', 'categories.slice(0, 0).forEach'),
  },
  {
    name: 'secondary-category-dropped',
    expected: 'article-multicategory-renderer-missing:categories.slice(1).forEach',
    apply: (fixture) => mutate(fixture, 'src/lib/commercial-renderers.ts', 'categories.slice(1).forEach', 'categories.slice(1, 1).forEach'),
  },
  {
    name: 'category-order-or-href-corrupted',
    expected: 'article-multicategory-renderer-missing:getCategoryPermalink(category)',
    apply: (fixture) => mutate(fixture, 'src/lib/commercial-renderers.ts', 'getCategoryPermalink(category)', 'getCategoryPermalink(categories[0])'),
  },
  {
    name: 'destination-build-wiring-removed',
    expected: 'category-package-command-invalid:category:contract',
    apply: (fixture) => mutate(fixture, 'package.json', 'node scripts/validate-category-contract.mjs', 'node -e \\"process.exit(0)\\"'),
  },
  {
    name: 'repository-ci-wiring-removed',
    expected: 'category-ci-wiring-missing:pnpm category:contract:negative',
    apply: (fixture) => mutate(fixture, '.github/workflows/category-contract.yml', 'pnpm category:contract:negative', 'pnpm test'),
  },
];

const results = [];
for (const testCase of cases) {
  const fixture = prepareFixture();
  try {
    testCase.apply(fixture);
    const run = spawnSync(process.execPath, [validator, '--root', fixture], { encoding: 'utf8' });
    const output = run.stdout + run.stderr;
    const passed = run.status !== 0 && output.includes(testCase.expected);
    results.push({ id: testCase.name, expected: testCase.expected, exitCode: run.status, passed });
    if (!passed) process.stderr.write(`NEGATIVE_CASE_FAIL ${testCase.name}\n${output}`);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

const failures = results.filter((result) => !result.passed);
console.log(JSON.stringify({ schema: 'commercial-category-contract-negative-v2', status: failures.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failures.length) process.exit(1);
console.log(`CATEGORY_CONTRACT_NEGATIVE_PASS ${results.length}`);
