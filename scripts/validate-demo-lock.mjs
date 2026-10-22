#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { load } from 'cheerio';

const root = resolve(new URL('..', import.meta.url).pathname);
const port = Number(process.env.DEMO_LOCK_PORT || 4387);
const origin = `http://127.0.0.1:${port}`;
const mutation = process.env.DEMO_LOCK_MUTATION || '';
const routes = [
  { path: '/', status: 200, family: 'index', text: 'Where business meets everyday life' },
  { path: '/about/', status: 200, family: 'about', text: 'About Commercial Daily News' },
  { path: '/team/', status: 200, family: 'team', text: 'The Commercial Daily News newsroom' },
  { path: '/privacy-policy/', status: 200, family: 'page', text: 'Privacy Policy' },
  { path: '/contact/', status: 200, family: 'contact', text: 'Contact Us' },
  { path: '/business-economy/', status: 200, family: 'category', text: 'Business &amp; Economy' },
  { path: '/author/patricia-waters/', status: 200, family: 'author', text: 'Patricia Waters' },
  { path: '/why-a-new-warehouse-can-change-a-whole-neighborhood/', status: 200, family: 'article', text: 'Why a new warehouse can change a whole neighborhood' },
  { path: '/demo-lock-missing-route/', status: 404, family: '404', text: 'Page Not Found' },
];
const files = {
  config: resolve(root, 'src/content/config/config.json'),
  header: resolve(root, 'src/content/navigation/header.json'),
  home: resolve(root, 'src/content/page/home.mdx'),
};
const originals = new Map();
let server;

function cleanEnvironment() {
  const env = { ...process.env, SITE_URL: origin, TINA_USE_LOCAL_CONTENT: '1' };
  for (const key of Object.keys(env)) {
    if (/^(TINA_TOKEN|NEXT_PUBLIC_TINA_CLIENT_ID|NEXT_PUBLIC_TINA_CONTENT_API_URL|TINA_UPSTREAM_CONTENT_API_URL|TINA_DIRECT_CONTENT_API_URL)$/.test(key)) delete env[key];
  }
  return env;
}

async function fetchPage(path) {
  return fetch(origin + path, { redirect: 'manual', headers: { 'cache-control': 'no-cache' } });
}

function templateSignature(html) {
  const $ = load(html);
  return $('[data-dc-tpl]').toArray().map((node) => {
    const element = $(node);
    const parent = element.parent().closest('[data-dc-tpl]').attr('data-dc-tpl') || '';
    return `${element.attr('data-dc-tpl')}:${String(node.tagName || '').toLowerCase()}:${parent}`;
  });
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Astro exited before readiness (${server.exitCode})`);
    try {
      const response = await fetchPage('/');
      if (response.status === 200) return;
    } catch (error) { lastError = error; }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error(`Astro readiness timeout${lastError ? `: ${lastError.message}` : ''}`);
}

async function assertRoutes() {
  const results = [];
  const htmlByPath = new Map();
  for (const route of routes) {
    const response = await fetchPage(route.path);
    const html = await response.text();
    htmlByPath.set(route.path, html);
    const expectedStatus = mutation === 'route-status' && route.path === '/' ? 418 : route.status;
    const expectedFamily = mutation === 'route-family' && route.path === '/' ? 'broken-index' : route.family;
    if (response.status !== expectedStatus) throw new Error(`route-status:${route.path}:expected-${expectedStatus}:got-${response.status}`);
    if (response.headers.get('x-demo-template') !== expectedFamily) throw new Error(`route-family:${route.path}:expected-${expectedFamily}:got-${response.headers.get('x-demo-template')}`);
    if (!html.includes(route.text)) throw new Error(`route-content:${route.path}:${route.text}`);
    if (html.includes('/our-team/') || html.includes('href="/blog/"')) throw new Error(`obsolete-route:${route.path}`);
    const authority = await readFile(resolve(root, `demo-authority/rendered/${route.family}.html`), 'utf8');
    const expectedStructure = templateSignature(authority);
    const currentStructure = templateSignature(html);
    if (mutation === 'dom-structure' && route.family === 'page') currentStructure.pop();
    if (JSON.stringify(currentStructure) !== JSON.stringify(expectedStructure)) {
      throw new Error(`route-template-structure:${route.path}:expected-${expectedStructure.length}:got-${currentStructure.length}`);
    }
    results.push({ path: route.path, status: response.status, family: route.family });
  }
  const requireHtml = (path, needles) => {
    const html = htmlByPath.get(path) || '';
    for (const needle of needles) if (!html.includes(needle)) throw new Error(`deep-mapping:${path}:${needle}`);
  };
  requireHtml('/privacy-policy/', ['Information We Collect', 'How We Use Information']);
  requireHtml('/team/', ['data-user-document="richard-sheppard"', 'data-user-document="teresa-fletcher"', 'Richard is the publisher of Commercial Daily News']);
  requireHtml('/contact/', ['action="https://formspree.io/f/xjygnadv"', 'name="_subject"', 'name="message"']);
  requireHtml('/why-a-new-warehouse-can-change-a-whole-neighborhood/', ['Business &amp; Economy', '>Featured<', '#what-arrives-with-a-large-employer', '/what-higher-insurance-costs-mean-for-first-time-buyers/']);
  const article = load(htmlByPath.get('/why-a-new-warehouse-can-change-a-whole-neighborhood/') || '');
  const categoryBadges = article('[data-article-category]');
  if (categoryBadges.length !== 2) throw new Error(`article-category-cardinality:expected-2:got-${categoryBadges.length}`);
  const categoryHrefs = categoryBadges.toArray().map((node) => article(node).attr('href'));
  if (JSON.stringify(categoryHrefs) !== JSON.stringify(['/business-economy/', '/featured/'])) {
    throw new Error(`article-category-routes:${JSON.stringify(categoryHrefs)}`);
  }
  const legacyCategory = await fetchPage('/category/business-economy/');
  if (legacyCategory.status !== 301 || legacyCategory.headers.get('location') !== '/business-economy/') {
    throw new Error(`legacy-category-redirect:${legacyCategory.status}:${legacyCategory.headers.get('location')}`);
  }
  const home = htmlByPath.get('/') || '';
  if ((home.match(/data-dc-tpl="69"/g) || []).length !== 3) throw new Error('deep-mapping:/:curated-story-count');
  if ((home.match(/data-dc-tpl="106"/g) || []).length !== 4) throw new Error('deep-mapping:/:homepage-newsroom-slot-count');
  return results;
}

async function assertDynamicInputs() {
  for (const path of Object.values(files)) originals.set(path, await readFile(path, 'utf8'));
  const marker = 'DEMO-LOCK-DYNAMIC-MARKER';
  const config = JSON.parse(originals.get(files.config));
  config.seo.title = marker;
  config.seo.logo = '/demo-assets/e20db23a4810a921938de046575132f5f7de4967466d87e795765eb89a817fe0.jpg';
  const header = JSON.parse(originals.get(files.header));
  header.items[0] = { label: marker, href: '/dynamic-navigation-proof/' };
  const home = originals.get(files.home).replace('Where business meets everyday life', marker);
  await writeFile(files.config, JSON.stringify(config, null, 2) + '\n');
  await writeFile(files.header, JSON.stringify(header, null, 2) + '\n');
  await writeFile(files.home, home);
  await new Promise((done) => setTimeout(done, 500));
  const response = await fetchPage('/');
  const html = await response.text();
  for (const expected of [marker, 'href="/dynamic-navigation-proof/"', config.seo.logo]) {
    const needle = mutation === 'dynamic-input' && expected === marker ? 'INTENTIONAL-MISSING-MARKER' : expected;
    if (!html.includes(needle)) throw new Error(`dynamic-input-not-rendered:${needle}`);
  }
  return { content: true, navigation: true, configLogo: true, configIdentity: true };
}

async function restore() {
  for (const [path, bytes] of originals) await writeFile(path, bytes);
  if (originals.size) {
    await new Promise((done) => setTimeout(done, 500));
    const html = await (await fetchPage('/')).text();
    if (html.includes('DEMO-LOCK-DYNAMIC-MARKER')) throw new Error('dynamic-input-restore-failed');
  }
}

try {
  server = spawn('pnpm', ['astro', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: root,
    env: cleanEnvironment(),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  server.stdout.resume();
  server.stderr.resume();
  await waitForServer();
  const routeResults = await assertRoutes();
  const dynamic = await assertDynamicInputs();
  await restore();
  console.log(JSON.stringify({ schema: 'commercial-demo-lock-v1', status: 'PASS', routes: routeResults, dynamic }, null, 2));
  console.log('ASTRO_DEMO_LOCK_PASS');
} catch (error) {
  try { await restore(); } catch (restoreError) { console.error(`ASTRO_DEMO_LOCK_RESTORE_FAIL ${restoreError.message}`); }
  console.error(`ASTRO_DEMO_LOCK_FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    try { process.kill(-server.pid, 'SIGTERM'); } catch (_error) { server.kill('SIGTERM'); }
    await Promise.race([once(server, 'exit'), new Promise((done) => setTimeout(done, 5000))]);
    if (server.exitCode === null) {
      try { process.kill(-server.pid, 'SIGKILL'); } catch (_error) { server.kill('SIGKILL'); }
    }
  }
}
