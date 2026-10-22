#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const argIndex = process.argv.indexOf('--root');
const root = resolve(argIndex >= 0 ? process.argv[argIndex + 1] : new URL('..', import.meta.url).pathname);
const failures = [];
const read = (relativePath) => {
  const path = join(root, relativePath);
  if (!existsSync(path)) {
    failures.push(`missing:${relativePath}`);
    return '';
  }
  return readFileSync(path, 'utf8');
};
const fail = (message) => failures.push(message);

function walkFiles(relativeDir) {
  const absoluteDir = join(root, relativeDir);
  if (!existsSync(absoluteDir)) return [];
  const files = [];
  for (const name of readdirSync(absoluteDir)) {
    const path = join(absoluteDir, name);
    if (statSync(path).isDirectory()) files.push(...walkFiles(join(relativeDir, name)));
    else files.push(path);
  }
  return files;
}

const permalinks = read('src/lib/permalinks.ts');
if (!/getCategoryPermalink[\s\S]*return slug \? ["']\/["'] \+ slug \+ ["']\/["'] : ["']\/["']/.test(permalinks)) {
  fail('category-permalink-not-prefix-free');
}
if (/getCategoryPermalink[\s\S]{0,220}["']\/category\//.test(permalinks)) fail('category-permalink-prefix-reintroduced');

const categorySchema = read('tina/collections/category.ts');
if (!/return `\/\$\{String\(document\._sys\.filename/.test(categorySchema)) fail('tina-category-router-not-prefix-free');
if (/return `\/category\//.test(categorySchema)) fail('tina-category-router-prefix-reintroduced');

const renderer = read('src/lib/commercial-renderers.ts');
for (const required of ['categories.slice(1).forEach', "data-article-category', 'secondary'", 'getCategoryPermalink(categories[0])', 'getCategoryPermalink(category)']) {
  if (!renderer.includes(required)) fail(`article-multicategory-renderer-missing:${required}`);
}
if (/attr\(['"]href['"],\s*`\/category\//.test(renderer)) fail('article-category-link-prefix-reintroduced');

const catchall = read('src/pages/[...slug].astro');
for (const required of ['const categoryDocuments', "family: 'category'", 'getEditableCategory', 'mutateCategory', '`/${categoryRouteSlug}/`']) {
  if (!catchall.includes(required)) fail(`prefix-free-category-route-missing:${required}`);
}
if (catchall.includes("routeSlug === 'business-economy')") || catchall.includes("'/category/business-economy/'")) {
  fail('business-economy-prefix-redirect-reintroduced');
}
if (/categoryRouteSlug[\s\S]{0,300}\/category\//.test(catchall)) fail('category-archive-prefix-reintroduced');
for (const required of [
  "filterPostsByCategory(allPosts, categoryRouteSlug)",
  "paginateCategoryPosts(filteredCategoryPosts, categoryPage, perPage)",
  "filteredCategoryPosts.length",
]) {
  if (!catchall.includes(required)) fail(`category-archive-filter-before-pagination-missing:${required}`);
}
if (catchall.includes('const categoryPosts = allPosts.slice(')) fail('category-archive-unfiltered-pagination-reintroduced');

const categoryArchiveModule = join(root, 'src/lib/category-archive.mjs');
if (!existsSync(categoryArchiveModule)) {
  fail('missing:src/lib/category-archive.mjs');
} else {
  try {
    const { filterPostsByCategory, paginateCategoryPosts, postCategorySlugs } = await import(`${pathToFileURL(categoryArchiveModule).href}?contract=${Date.now()}`);
    const fixturePosts = [
      { title: 'science-only', categories: ['src/content/category/science-technology.json'] },
      { title: 'world-only', categories: [{ _sys: { filename: 'world-news' } }] },
      { title: 'multi-category', categories: [{ category: 'src/content/category/science-technology.json' }, { _sys: { path: 'src/content/category/world-news.json' } }] },
      { title: 'legacy-health', category: 'src/content/category/health.json' },
    ];
    const science = filterPostsByCategory(fixturePosts, 'science-technology');
    const world = filterPostsByCategory(fixturePosts, { _sys: { filename: 'world-news' } });
    if (science.map((post) => post.title).join('|') !== 'science-only|multi-category') fail('category-membership-science-fixture-failed');
    if (world.map((post) => post.title).join('|') !== 'world-only|multi-category') fail('category-membership-world-fixture-failed');
    if (postCategorySlugs(fixturePosts[3]).join('|') !== 'health') fail('category-membership-legacy-shape-failed');
    if (paginateCategoryPosts(science, 2, 1).map((post) => post.title).join('|') !== 'multi-category') fail('category-filter-before-pagination-fixture-failed');
    if (filterPostsByCategory(fixturePosts, 'empty-category').length !== 0) fail('category-empty-state-input-fixture-failed');
  } catch (error) {
    fail(`category-membership-module-error:${error.message}`);
  }
}

for (const required of ['data-empty-post-list="true"', 'No published posts yet.', 'else card.remove()', 'const totalPages = Math.ceil(totalPosts / perPage)']) {
  if (!renderer.includes(required)) fail(`category-renderer-filtered-state-missing:${required}`);
}

const legacy = read('src/pages/category/[...slug].astro');
if (!legacy.includes('Astro.redirect(`/${slug}/`, 301)')) fail('legacy-category-route-does-not-redirect-prefix-free');
const blogLegacy = read('src/pages/blog/category/[...slug].astro');
if (!blogLegacy.includes('Astro.redirect(`/${slug}/`, 301)')) fail('blog-category-route-does-not-redirect-prefix-free');

for (const path of walkFiles('src/content/navigation')) {
  const text = readFileSync(path, 'utf8');
  if (/"href"\s*:\s*"\/category\//.test(text)) fail(`navigation-category-prefix:${path.slice(root.length + 1)}`);
}
for (const path of walkFiles('src/content/category')) {
  const text = readFileSync(path, 'utf8');
  if (/"canonicalUrl"\s*:\s*"\/category\//.test(text)) fail(`category-canonical-prefix:${path.slice(root.length + 1)}`);
}

const packageJson = read('package.json');
if (packageJson) {
  let pkg;
  try { pkg = JSON.parse(packageJson); } catch { fail('package-json-invalid'); }
  const scripts = pkg?.scripts ?? {};
  const expectedScripts = {
    'category:contract': 'node scripts/validate-category-contract.mjs',
    'category:contract:negative': 'node scripts/test-category-contract-negative.mjs',
  };
  for (const [name, command] of Object.entries(expectedScripts)) {
    if (scripts[name] !== command) fail(`category-package-command-invalid:${name}`);
  }
  for (const name of ['validate:starter', 'validate:site']) {
    if (!String(scripts[name] ?? '').includes('category:contract')) fail(`category-package-wiring-missing:${name}`);
  }
  for (const name of ['build', 'build:local']) {
    const command = String(scripts[name] ?? '');
    if (!command.includes('validate:site') && !command.includes('validate:starter')) fail(`category-package-wiring-missing:${name}`);
  }
}

const ciWorkflow = read('.github/workflows/category-contract.yml');
for (const required of ['push:', 'pull_request:', 'pnpm category:contract', 'pnpm category:contract:negative']) {
  if (!ciWorkflow.includes(required)) fail(`category-ci-wiring-missing:${required}`);
}

const result = {
  schema: 'commercial-category-contract-v1',
  status: failures.length ? 'FAIL' : 'PASS',
  root,
  contract: {
    categoryRoutes: 'prefix-free',
    legacyCategoryRoutes: '301-to-prefix-free',
    articleCategoryCardinality: 'all-selected-in-order',
  },
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) {
  console.error(`CATEGORY_CONTRACT_FAIL ${failures.join(';')}`);
  process.exit(1);
}
console.log('CATEGORY_CONTRACT_PASS');
