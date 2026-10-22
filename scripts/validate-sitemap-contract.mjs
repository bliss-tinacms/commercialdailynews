#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const routePath = path.resolve(process.env.SITEMAP_ROUTE || 'src/pages/sitemap.astro');
const helperPath = path.resolve(process.env.SITEMAP_HELPER || 'src/lib/sitemap-entries.mjs');
const route = fs.readFileSync(routePath, 'utf8');
const failures = [];

for (const token of ['listCategories', 'listUsers', 'getCategoryPermalink', 'referenceSlug', "heading: 'Categories'", "heading: 'Authors'", "add('Categories'", "add('Authors'"]) {
  if (route.includes(token)) failures.push(`forbidden sitemap content source: ${token}`);
}
for (const required of ['listPages()', 'listBlogs()', 'buildSitemapSections', "replaceAllContent: true", "attr('data-sitemap-content', '')", "Browse public webpages and posts published by Commercial Daily News."]) {
  if (!route.includes(required)) failures.push(`missing sitemap route contract: ${required}`);
}

const { buildSitemapSections } = await import(`${pathToFileURL(helperPath).href}?v=${Date.now()}`);
const sections = buildSitemapSections({
  pages: [
    { title: 'Home', _sys: { filename: 'home' } },
    { title: 'About', permalink: 'about', _sys: { filename: 'about' } },
    { title: 'Draft Page', draft: true, _sys: { filename: 'draft-page' } },
    { title: 'Noindex Page', seo: { noindex: true }, _sys: { filename: 'noindex-page' } },
    { title: '404', _sys: { filename: '404' } },
    { title: 'Sitemap', _sys: { filename: 'sitemap' } },
  ],
  posts: [
    { title: 'Published Post', permalink: 'published-post', _sys: { filename: 'published-post' } },
    { title: 'Draft Post', draft: true, _sys: { filename: 'draft-post' } },
    { title: 'Noindex Post', seo: { noindex: true }, _sys: { filename: 'noindex-post' } },
  ],
  categories: [{ title: 'Forbidden Category', permalink: 'forbidden-category' }],
  users: [{ name: 'Forbidden Author', _sys: { filename: 'forbidden-author' } }],
  pageHref: (page) => page._sys.filename === 'home' ? '/' : page.permalink || page._sys.filename,
  postHref: (post) => post.permalink || post._sys.filename,
});
const expected = [
  { heading: 'Pages', items: [{ title: 'Home', href: '/' }, { title: 'About', href: '/about/' }] },
  { heading: 'Posts', items: [{ title: 'Published Post', href: '/published-post/' }] },
];
if (JSON.stringify(sections) !== JSON.stringify(expected)) {
  failures.push(`sitemap sections must be the exact published page/post allowlist: ${JSON.stringify(sections)}`);
}
if (sections.some((section) => !['Pages', 'Posts'].includes(section.heading))) failures.push('sitemap contains a non-page/non-post section');

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', failures }, null, 2));
  process.exit(1);
}
console.log('SITEMAP_CONTENT_CONTRACT_PASS');
