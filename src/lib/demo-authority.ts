import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';

export type DemoFamily = 'index' | 'about' | 'team' | 'page' | 'contact' | 'category' | 'author' | 'article' | '404';

type Seo = {
  title: string;
  description: string;
  canonical: string;
  image?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
  type?: 'website' | 'article';
};

type RenderOptions = {
  family: DemoFamily;
  seo: Seo;
  status?: number;
  chrome?: GlobalChrome;
  mutate?: ($: cheerio.CheerioAPI) => void;
};

export type GlobalChrome = { config?: any; headerNavigation?: any; footerNavigation?: any };
type NavItem = { label: string; href: string; children: NavItem[] };

const authorityRoot = join(process.cwd(), 'demo-authority', 'rendered');
const FALLBACK_LOGO = '/demo-assets/1250a1c335598dc8be3de3ae58496f4638fb5f129b7328d5ec9534c0c9ded39f.png';

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const site = process.env.SITE_URL || 'http://localhost:4321';
  return new URL(path, site).toString();
}

function setMeta($: cheerio.CheerioAPI, seo: Seo, config: any) {
  $('head title, head meta[name="description"], head meta[name="robots"], head link[rel="canonical"], head link[rel~="icon"], head meta[property^="og:"], head meta[name^="twitter:"]').remove();
  const robots = `${seo.noindex ? 'noindex' : 'index'}, ${seo.nofollow ? 'nofollow' : 'follow'}`;
  const image = absoluteUrl(imageUrl(seo.image, config?.seo?.logo || FALLBACK_LOGO));
  const ogTitle = seo.ogTitle || seo.title;
  const ogDescription = seo.ogDescription || seo.description;
  const favicon = imageUrl(config?.seo?.favicon || config?.favicon || '/favicon.svg');
  $('head').append([
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeAttr(seo.description)}">`,
    `<meta name="robots" content="${robots}">`,
    `<link rel="canonical" href="${escapeAttr(absoluteUrl(seo.canonical))}">`,
    favicon ? `<link rel="icon" href="${escapeAttr(favicon)}">` : '',
    `<meta property="og:type" content="${seo.type || 'website'}">`,
    `<meta property="og:title" content="${escapeAttr(ogTitle)}">`,
    `<meta property="og:description" content="${escapeAttr(ogDescription)}">`,
    `<meta property="og:url" content="${escapeAttr(absoluteUrl(seo.canonical))}">`,
    `<meta property="og:image" content="${escapeAttr(image)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeAttr(ogTitle)}">`,
    `<meta name="twitter:description" content="${escapeAttr(ogDescription)}">`,
    `<meta name="twitter:image" content="${escapeAttr(image)}">`,
  ].join(''));
}

function navigationItems(value: any): NavItem[] {
  return (Array.isArray(value?.items) ? value.items : []).flatMap((item: any) => {
    if (!item?.label || !item?.href) return [];
    return [{
      label: String(item.label),
      href: String(item.href),
      children: (Array.isArray(item.children) ? item.children : []).flatMap((child: any) =>
        child?.label && child?.href ? [{ label: String(child.label), href: String(child.href), children: [] }] : [],
      ),
    }];
  });
}

function replaceLinks($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>, items: NavItem[]) {
  const links = root.children('a').toArray();
  root.children('.cdn-submenu').remove();
  links.forEach((node, index) => {
    const item = items[index];
    if (!item) return;
    const link = $(node).text(item.label).attr('href', item.href);
    if (item.children.length) {
      const submenu = $('<div class="cdn-submenu">');
      for (const child of item.children) submenu.append($('<a>').text(child.label).attr('href', child.href));
      link.after(submenu);
    }
  });
}

function installResponsiveHeader($: cheerio.CheerioAPI, items: NavItem[]) {
  const header = $('header').first();
  const row = header.children('div').first();
  const navs = row.children('nav').toArray();
  if (navs.length < 2) return;
  const split = Math.ceil(items.length / 2);
  const left = $(navs[0]);
  const right = $(navs[1]);
  left.addClass('cdn-desktop-nav cdn-nav-left');
  right.addClass('cdn-desktop-nav cdn-nav-right');
  replaceLinks($, left, items.slice(0, split));
  replaceLinks($, right, items.slice(split));

  const logo = row.children('a').filter((_i, node) => $(node).find('img').length > 0).first();
  $('<span class="cdn-mobile-spacer" aria-hidden="true"></span>').insertBefore(logo);
  const control = $('<div class="cdn-mobile-control">');
  const button = $('<button type="button" aria-label="Menu" aria-expanded="false" aria-controls="cdn-mobile-menu">').html('<svg class="cdn-menu-open" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"></path></svg><svg class="cdn-menu-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>');
  control.append(button);
  row.append(control);
  const mobile = $('<nav id="cdn-mobile-menu" class="cdn-mobile-menu" aria-label="Mobile navigation">');
  for (const item of items) {
    mobile.append($('<a>').text(item.label).attr('href', item.href));
    for (const child of item.children) mobile.append($('<a class="cdn-mobile-child">').text(child.label).attr('href', child.href));
  }
  header.append(mobile);
  $('head').append(`<style id="cdn-responsive-header">
html,body{max-width:100%;overflow-x:hidden}.cdn-mobile-spacer,.cdn-mobile-control,.cdn-mobile-menu{display:none}.cdn-submenu{display:none}
@media(max-width:1099px){header>div:first-child{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)!important;gap:clamp(12px,4vw,64px)!important}.cdn-desktop-nav{display:none!important}.cdn-mobile-spacer,.cdn-mobile-control{display:flex}.cdn-mobile-control{justify-content:flex-end}.cdn-mobile-control button{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border:0;border-radius:50%;background:#E8B23A;color:#0E1F3D;cursor:pointer;padding:0}.cdn-menu-close{display:none}.cdn-mobile-menu{border-top:1px solid #ffffff1f;padding:8px clamp(16px,3vw,32px) 20px;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));column-gap:32px;max-height:calc(100vh - 84px);overflow-y:auto}.cdn-mobile-menu[data-open]{display:grid}.cdn-mobile-menu a{color:#fff;font-weight:600;font-size:18px;padding:14px 0;border-bottom:1px solid #ffffff14}.cdn-mobile-menu a:hover{color:#E8B23A}.cdn-mobile-menu .cdn-mobile-child{padding-left:20px;font-size:16px}.cdn-mobile-control button[aria-expanded="true"] .cdn-menu-open{display:none}.cdn-mobile-control button[aria-expanded="true"] .cdn-menu-close{display:block}}
</style>`);
  $('body').append(`<script>(()=>{const b=document.querySelector('.cdn-mobile-control button');const m=document.getElementById('cdn-mobile-menu');if(!b||!m)return;const close=()=>{b.setAttribute('aria-expanded','false');m.removeAttribute('data-open')};b.addEventListener('click',()=>{const open=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(open));m.toggleAttribute('data-open',open)});m.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));addEventListener('resize',()=>{if(innerWidth>=1100)close()})})()</script>`);
}

function setGlobalChrome($: cheerio.CheerioAPI, chrome: GlobalChrome = {}) {
  $('[src], [href]').each((_index, element) => {
    for (const attribute of ['src', 'href']) {
      const value = $(element).attr(attribute);
      if (value?.startsWith('../assets/')) $(element).attr(attribute, value.replace('../assets/', '/demo-assets/'));
    }
  });
  $('style, script').each((_index, element) => {
    const source = $(element).html();
    if (source?.includes('../assets/')) $(element).html(source.replaceAll('../assets/', '/demo-assets/'));
  });

  const config = chrome.config || {};
  const siteName = String(config?.seo?.title || 'Commercial Daily News');
  const logos = $('img[alt="Commercial Daily News"]').toArray();
  logos.forEach((logo, index) => {
    const source = imageUrl(index === logos.length - 1 ? config?.seo?.footerLogo || config?.seo?.logo : config?.seo?.logo);
    $(logo).attr('alt', siteName);
    if (source) $(logo).attr('src', source);
    $(logo).parent('a').attr('href', '/');
  });

  const headerItems = navigationItems(chrome.headerNavigation);
  if (headerItems.length) installResponsiveHeader($, headerItems);

  const footerItems = navigationItems(chrome.footerNavigation);
  const footerNav = $('footer nav').first();
  if (footerItems.length && footerNav.length) replaceLinks($, footerNav, footerItems);
  const legalItems = Array.isArray(config.legalLinks) ? config.legalLinks.flatMap((item: any) => item?.label && item?.href ? [{ label: String(item.label), href: String(item.href), children: [] }] : []) : [];
  const legalRoot = $('footer a').filter((_i, node) => $(node).text().trim() === 'Editorial Guidelines').first().parent();
  if (legalItems.length && legalRoot.length) replaceLinks($, legalRoot, legalItems);
  const copyright = String(config.copyrightText || `© {year} ${siteName}. All rights reserved.`).replaceAll('{year}', String(new Date().getUTCFullYear())).replaceAll('{owner}', String(config?.seo?.siteOwner || siteName));
  $('footer span').filter((_i, node) => $(node).text().trim().startsWith('©')).first().text(copyright);
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
export function escapeAttr(value: unknown): string { return escapeHtml(value); }

export function referenceSlug(reference: any): string {
  const value = typeof reference === 'string' ? reference.split('/').pop()?.replace(/\.(json|mdx?)$/i, '') || '' : reference?._sys?.filename || reference?.name || reference?.title || '';
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
export function referenceLabel(reference: any): string {
  if (Array.isArray(reference)) return reference.map(referenceLabel).filter(Boolean).join(', ');
  if (typeof reference === 'string') return (reference.split('/').pop()?.replace(/\.(json|mdx?)$/i, '') || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return String(reference?.title || reference?.name || '');
}
export function postUrl(post: any): string {
  const slug = post?.permalink || post?._sys?.filename || '';
  return `/${String(slug).replace(/^\/+|\/+$/g, '')}/`;
}
export function imageUrl(value: unknown, fallback = ''): string {
  const image = String(value || fallback);
  return image.startsWith('../assets/') ? image.replace('../assets/', '/demo-assets/') : image;
}
export function formatDate(value: unknown, style: 'long' | 'short' = 'long'): string {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: style === 'long' ? 'long' : 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function textOfRichNode(node: any): string {
  if (!node) return '';
  if (typeof node.text === 'string') return node.text;
  return Array.isArray(node.children) ? node.children.map(textOfRichNode).join('') : '';
}
function inlineMarkdown(value: string): string {
  let out = escapeHtml(value);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>');
  out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>').replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  return out;
}
function richChildren(node: any): string {
  return (Array.isArray(node?.children) ? node.children : []).map((child: any) => {
    if (typeof child?.text === 'string') {
      let text = escapeHtml(child.text);
      if (child.bold) text = `<strong>${text}</strong>`;
      if (child.italic) text = `<em>${text}</em>`;
      if (child.code) text = `<code>${text}</code>`;
      return text;
    }
    if (child?.type === 'a' || child?.url) return `<a href="${escapeAttr(child.url || child.href || '#')}">${richChildren(child)}</a>`;
    return richChildren(child);
  }).join('');
}

export function richBodyHtml(body: any, prototypes?: Record<string, string | undefined>): string {
  if (!body) return '';
  if (typeof body === 'string') {
    const lines = body.replace(/\r/g, '').split('\n');
    let html = '';
    for (let i = 0; i < lines.length;) {
      const line = lines[i];
      if (!line.trim()) { i += 1; continue; }
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) { const tag = `h${heading[1].length}`; const text = heading[2].trim(); html += `<${tag} id="${referenceSlug(text)}"${prototypes?.[tag] ? ` style="${escapeAttr(prototypes[tag])}"` : ''}>${inlineMarkdown(text)}</${tag}>`; i += 1; continue; }
      if (/^[-*+]\s+/.test(line)) { const items: string[] = []; while (i < lines.length && /^[-*+]\s+/.test(lines[i])) items.push(lines[i++].replace(/^[-*+]\s+/, '')); html += `<ul>${items.map(x => `<li>${inlineMarkdown(x)}</li>`).join('')}</ul>`; continue; }
      if (/^\d+[.)]\s+/.test(line)) { const items: string[] = []; while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\d+[.)]\s+/, '')); html += `<ol>${items.map(x => `<li>${inlineMarkdown(x)}</li>`).join('')}</ol>`; continue; }
      if (/^>\s?/.test(line)) { html += `<blockquote${prototypes?.blockquote ? ` style="${escapeAttr(prototypes.blockquote)}"` : ''}>${inlineMarkdown(line.replace(/^>\s?/, ''))}</blockquote>`; i += 1; continue; }
      const paragraph: string[] = []; while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s|^[-*+]\s|^\d+[.)]\s|^>\s?/.test(lines[i])) paragraph.push(lines[i++]);
      html += `<p${prototypes?.p ? ` style="${escapeAttr(prototypes.p)}"` : ''}>${inlineMarkdown(paragraph.join(' '))}</p>`;
    }
    return html;
  }
  const renderNode = (node: any): string => {
    const type = String(node?.type || 'p');
    if (type === 'ul' || type === 'ol') return `<${type}>${(node.children || []).map((child: any) => `<li>${richChildren(child) || renderNode(child)}</li>`).join('')}</${type}>`;
    if (type === 'li') return `<li>${richChildren(node)}</li>`;
    const tag = /^h[1-6]$/.test(type) ? type : type === 'blockquote' ? 'blockquote' : 'p';
    const plain = textOfRichNode(node);
    const id = /^h[1-6]$/.test(tag) ? ` id="${referenceSlug(plain)}"` : '';
    return `<${tag}${id}${prototypes?.[tag] ? ` style="${escapeAttr(prototypes[tag])}"` : ''}>${richChildren(node) || escapeHtml(plain)}</${tag}>`;
  };
  return (Array.isArray(body?.children) ? body.children : []).map(renderNode).join('');
}

export function renderAuthority(options: RenderOptions): Response {
  const source = readFileSync(join(authorityRoot, `${options.family}.html`), 'utf8');
  const $ = cheerio.load(source);
  setGlobalChrome($, options.chrome);
  options.mutate?.($);
  setMeta($, options.seo, options.chrome?.config || {});
  const html = '<!DOCTYPE html>\n' + $.html();
  return new Response(html, { status: options.status || 200, headers: { 'content-type': 'text/html; charset=utf-8', 'x-demo-template': options.family } });
}
