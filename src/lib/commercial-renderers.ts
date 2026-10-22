import type * as cheerio from 'cheerio';
import { formatDate, imageUrl, postUrl, referenceLabel, referenceSlug, richBodyHtml } from './demo-authority';

export type UserProfile = { name?: string; role?: string; location?: string; order?: number; avatar?: string; avatarAlt?: string; bio?: string; _sys?: { filename?: string } };

export function sortNewsroom(users: UserProfile[]): UserProfile[] {
  return [...users].sort((a, b) => (Number(a.order) || Number.MAX_SAFE_INTEGER) - (Number(b.order) || Number.MAX_SAFE_INTEGER));
}
function setText($: cheerio.CheerioAPI, selector: string, value: unknown) {
  if (value !== undefined && value !== null && String(value).trim()) $(selector).first().text(String(value));
}
function replaceDirectText($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>, value: unknown) {
  if (value === undefined || value === null || !String(value).trim()) return;
  element.contents().filter((_index, node) => node.type === 'text').remove();
  element.append(String(value));
}
function demoSections(page: any): any[] { return Array.isArray(page?.demoSections) ? page.demoSections : []; }
function setImage($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>, src: unknown, alt: unknown) {
  if (src) element.attr('src', imageUrl(src));
  element.attr('alt', String(alt || ''));
}
function authorName(post: any) { return referenceLabel(post?.author); }

function setPostCard($: cheerio.CheerioAPI, cardNode: any, post: any, includeAuthor = true) {
  const card = $(cardNode);
  card.attr('href', postUrl(post));
  setImage($, card.find('img').first(), post?.heroImage, post?.heroImageAlt || post?.title);
  const title = card.find('span').filter((_i, node) => /Newsreader/.test($(node).attr('style') || '')).first();
  if (post?.title) title.text(post.title);
  const description = card.find('span').filter((_i, node) => /font-size:\s*17px/.test($(node).attr('style') || '')).first();
  if (description.length && post?.description) description.text(post.description);
  if (includeAuthor) {
    const author = authorName(post);
    const line = card.find('span').filter((_i, node) => $(node).find('img').length > 0).first();
    const avatar = line.find('img').first();
    if (post?.author?.avatar) setImage($, avatar, post.author.avatar, post.author.avatarAlt || author);
    const authorText = line.children('span').first();
    if (authorText.length && author) authorText.text(author);
  }
  const date = card.find('span').filter((_i, node) => /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d|\d{4}/.test($(node).text())).last();
  if (date.length && post?.pubDate) date.text(formatDate(post.pubDate, 'short'));
}

export function mutateHome($: cheerio.CheerioAPI, page: any, _posts: any[], users: UserProfile[]) {
  setText($, '[data-dc-tpl="47"]', page?.demoHeadline || page?.title);
  setText($, '[data-dc-tpl="48"]', page?.demoIntroduction);
  setImage($, $('[data-dc-tpl="43"]').first(), page?.homeHeroImage, page?.homeHeroImageAlt);
  const sections = demoSections(page);
  const headings = ['54', '65', '79', '93', '103'];
  headings.forEach((id, index) => setText($, `[data-dc-tpl="${id}"]`, sections[index]?.heading));
  setText($, '[data-dc-tpl="55"]', sections[0]?.body);
  setText($, '[data-dc-tpl="80"]', sections[2]?.body);
  setText($, '[data-dc-tpl="99"]', sections[3]?.body);
  [['51', 0], ['90', 3], ['115', 5]].forEach(([id, index]) => setImage($, $(`[data-dc-tpl="${id}"]`).first(), sections[index as number]?.image, sections[index as number]?.imageAlt));

  const curated = Array.isArray(page?.homepageStories) ? page.homepageStories.slice(0, 3) : [];
  const storyCards = $('[data-dc-tpl="69"]').toArray();
  storyCards.forEach((node, index) => {
    const item = curated[index];
    if (!item) return;
    const card = $(node);
    card.attr('href', postUrl(item.post));
    setImage($, card.find('img').first(), item.image, item.imageAlt);
    const spans = card.find('span').toArray();
    if (spans[0]) $(spans[0]).text(item.category || '');
    if (spans[1]) $(spans[1]).text(item.post?.title || '');
    if (spans[2]) $(spans[2]).text(item.description || '');
    if (spans[3]) $(spans[3]).text([item.date, item.readTime].filter(Boolean).join(' · '));
  });

  const ordered = sortNewsroom(users);
  const cards = $('[data-dc-tpl="106"]').toArray();
  cards.forEach((node, index) => {
    const user = ordered[index];
    if (!user) return;
    const card = $(node);
    card.attr('href', `/author/${referenceSlug(user)}/`).attr('data-user-document', user._sys?.filename || referenceSlug(user));
    setImage($, card.find('img').first(), user.avatar, user.avatarAlt || user.name);
    const fields = [
      card.find('[data-dc-tpl="109"]').first(),
      card.find('[data-dc-tpl="110"]').first(),
      card.find('[data-dc-tpl="111"]').first(),
    ];
    [user.name, user.role, user.location].forEach((value, fieldIndex) => {
      const field = fields[fieldIndex];
      const interpolation = field.find('.sc-interp').first();
      if (interpolation.length) interpolation.text(value || '');
      else field.text(value || '');
    });
  });
}

export function mutateAbout($: cheerio.CheerioAPI, page: any) {
  setText($, '[data-dc-tpl="46"]', page?.demoHeadline || page?.title);
  const intro = String(page?.demoIntroduction || '').split(/\n{2,}/).filter(Boolean);
  ['47', '48', '49'].forEach((id, index) => setText($, `[data-dc-tpl="${id}"]`, intro[index]));
  const sections = demoSections(page);
  const headingSelectors = ['58', '66', '81', '105', '114'];
  const paragraphGroups = [['59', '60', '61'], ['67', '76'], ['82', '100'], ['106', '107', '108'], ['115']];
  sections.forEach((section, index) => {
    setText($, `[data-dc-tpl="${headingSelectors[index]}"]`, section?.heading);
    const paragraphs = String(section?.body || '').split(/\n{2,}/).filter(Boolean);
    paragraphGroups[index]?.forEach((id, pIndex) => setText($, `[data-dc-tpl="${id}"]`, paragraphs[pIndex]));
  });
  setImage($, $('[data-dc-tpl="51"]').first(), sections[0]?.image, sections[0]?.imageAlt);
  setImage($, $('[data-dc-tpl="55"]').first(), sections[1]?.image, sections[1]?.imageAlt);
  setImage($, $('[data-dc-tpl="110"]').first(), sections[3]?.image, sections[3]?.imageAlt);
  (sections[1]?.items || []).slice(0, 3).forEach((item: any, index: number) => {
    setText($, `[data-dc-tpl="${[71, 73, 75][index]}"]`, item.title);
    const container = $(`[data-dc-tpl="${[70, 72, 74][index]}"]`);
    container.contents().filter((_i, node) => node.type === 'text').remove();
    container.append(' ' + String(item.body || ''));
  });
  (sections[2]?.items || []).slice(0, 5).forEach((item: any, index: number) => {
    setText($, `[data-dc-tpl="${[86, 89, 92, 95, 98][index]}"]`, item.title);
    setText($, `[data-dc-tpl="${[87, 90, 93, 96, 99][index]}"]`, item.body);
  });
}

function teamCards($: cheerio.CheerioAPI): cheerio.Cheerio<any>[] {
  return $('h2[data-dc-tpl], h3[data-dc-tpl]').toArray().map((heading) => {
    let card = $(heading).parent();
    while (card.parent().length && (!card.find('img').length || !card.find('p').length)) card = card.parent();
    return card;
  });
}
export function mutateTeam($: cheerio.CheerioAPI, page: any, users: UserProfile[]) {
  setText($, '[data-dc-tpl="45"]', page?.demoHeadline || page?.title);
  setText($, '[data-dc-tpl="46"]', page?.demoIntroduction);
  const ordered = sortNewsroom(users);
  const cards = teamCards($);
  cards.forEach((card, index) => {
    const user = ordered[index];
    if (!user) return;
    const heading = card.find('h2, h3').first();
    heading.text(user.name || '');
    setImage($, card.find('img').first(), user.avatar, user.avatarAlt || user.name);
    card.find('p').first().text(user.bio || '');
    const roleLine = heading.siblings('div').first();
    if (roleLine.length) roleLine.text([user.role, user.location].filter(Boolean).join(' · '));
    card.attr('data-user-document', user._sys?.filename || referenceSlug(user));
  });
}

export function mutateGenericPage($: cheerio.CheerioAPI, page: any) {
  setText($, '[data-dc-tpl="44"]', page?.demoHeadline || page?.title);
  const main = $('[data-dc-tpl="45"]').first();
  const contentBlock = (page?.blocks || []).find((block: any) => block?.__typename === 'PageBlocksContent' || block?.body);
  const pageBody = typeof page?.body === 'string' ? (page.body.trim() ? page.body : null) : page?.body;
  const body = pageBody || contentBlock?.body;
  if (!main.length || !body) return;
  const sourceNodes = main.children().toArray();
  const prototypes: Record<string, string | undefined> = { p: main.find('p').first().attr('style'), h2: main.find('h2').first().attr('style'), h3: main.find('h2').first().attr('style'), blockquote: main.find('blockquote').first().attr('style') };
  const rendered = $('<div>').html(richBodyHtml(body, prototypes));
  const values = rendered.children().toArray();
  sourceNodes.forEach((node, index) => {
    const value = values[index];
    if (!value) return;
    const target = $(node);
    target.html($(value).html() || '');
    if (/^h[1-6]$/i.test(String(node.tagName || ''))) {
      const id = $(value).attr('id') || referenceSlug(target.text());
      if (id) target.attr('id', id);
    }
  });
}

function validFormspree(value: unknown): string {
  const endpoint = String(value || '').trim();
  return /^https:\/\/formspree\.io\/f\/[A-Za-z0-9_-]+$/.test(endpoint) ? endpoint : '';
}
export function mutateContact($: cheerio.CheerioAPI, page: any, config: any) {
  setText($, '[data-dc-tpl="44"]', page?.demoHeadline || page?.title);
  setText($, '[data-dc-tpl="45"]', page?.demoIntroduction);
  const form = $('form[data-dc-tpl="50"]').first();
  const endpoint = validFormspree(config?.contactForm?.formspreeEndpoint);
  if (endpoint) form.attr('action', endpoint).attr('method', 'POST');
  else { form.removeAttr('action').attr('data-disabled', 'invalid-form-endpoint'); form.find('button').attr('disabled', 'disabled').attr('aria-disabled', 'true'); }
  setText($, '[data-dc-tpl="51"]', config?.contactForm?.heading);
  const formDescription = form.find('p').first();
  if (formDescription.length) formDescription.text(config?.contactForm?.description || '');
  setText($, '[data-dc-tpl="61"]', config?.contactForm?.buttonText);
  const note = form.find('p').last();
  if (note.length) note.text(config?.contactForm?.note || '');
  form.find('input[name="_subject"]').remove();
  form.append($('<input>').attr({ type: 'hidden', name: '_subject', value: String(config?.contactForm?.subject || 'Commercial Daily News contact form') }));
  form.find('input').not('[type="hidden"]').each((index, input) => {
    const names = ['name', 'phone', 'email'];
    $(input).attr('name', names[index] || `field_${index + 1}`);
    if (names[index] === 'email') $(input).attr('type', 'email').attr('required', 'required');
  });
  form.find('textarea').first().attr('name', 'message').attr('required', 'required');
  const inboxes = Array.isArray(page?.contactInboxes) ? page.contactInboxes : [];
  ['69', '74'].forEach((id, index) => {
    const item = inboxes[index]; if (!item) return;
    setText($, `[data-dc-tpl="${id}"]`, item.title);
    setText($, `[data-dc-tpl="${[70, 75][index]}"]`, item.description);
    const link = $(`[data-dc-tpl="${[71, 77][index]}"]`); link.text(item.email || '').attr('href', `mailto:${encodeURIComponent(item.email || '')}`);
    setText($, `[data-dc-tpl="${[72, 76][index]}"]`, item.note);
  });
  const requests = Array.isArray(page?.contactRequests) ? page.contactRequests : [];
  const requestCards = $('[data-dc-tpl="82"], [data-dc-tpl="87"], [data-dc-tpl="92"]').toArray();
  requestCards.forEach((node, index) => {
    const item = requests[index]; if (!item) return;
    const card = $(node).attr('href', item.link || '#');
    card.find('h3').first().text(item.title || '');
    card.find('p').first().text(item.description || '');
    card.find('span').first().contents().first().replaceWith(item.linkText || '');
  });
}

function setFeatured($: cheerio.CheerioAPI, featured: cheerio.Cheerio<any>, post: any, includeAuthor: boolean) {
  featured.attr('href', postUrl(post));
  setImage($, featured.find('img').first(), post?.heroImage, post?.heroImageAlt || post?.title);
  const spans = featured.find('span').toArray();
  const title = spans.find(node => /Newsreader/.test($(node).attr('style') || ''));
  if (title) $(title).text(post?.title || '');
  const desc = spans.find(node => /font-size:\s*17px/.test($(node).attr('style') || ''));
  if (desc) $(desc).text(post?.description || '');
  if (includeAuthor) {
    const meta = featured.find('span').filter((_i, node) => $(node).find('img').length > 0).first();
    setImage($, meta.find('img').first(), post?.author?.avatar, post?.author?.avatarAlt || authorName(post));
    meta.children('span').first().text(authorName(post));
  }
  const date = featured.find('span').filter((_i, node) => /Oct\s+\d|\d{4}/.test($(node).text())).last();
  if (date.length) date.text(formatDate(post?.pubDate, 'short'));
}
function paginate($: cheerio.CheerioAPI, nav: cheerio.Cheerio<any>, base: string, currentPage: number, _totalPosts: number, _perPage: number) {
  if (!nav.length) return;
  // Do not rebuild the authority pager: its node count, spacing, and inline
  // styles are part of the immutable supplied demo. Only make its existing
  // controls functional.
  const links = nav.children('a').toArray();
  const numbered = links.slice(0, -1);
  numbered.forEach((node, index) => {
    const page = index + 1;
    const link = $(node).text(String(page)).attr('href', page === 1 ? `${base}/` : `${base}/page/${page}/`).attr('aria-label', `Page ${page}`);
    if (page === currentPage) link.attr('aria-current', 'page');
    else link.removeAttr('aria-current');
  });
  if (links.length) {
    $(links[links.length - 1])
      .text('Next →')
      .attr('href', `${base}/page/${currentPage + 1}/`)
      .attr('aria-label', 'Next page')
      .removeAttr('aria-disabled tabindex');
  }
}

export function mutateCategory($: cheerio.CheerioAPI, category: any, posts: any[], currentPage = 1, totalPosts = posts.length, perPage = 7) {
  setText($, '[data-dc-tpl="44"]', category?.title);
  const featured = $('[data-dc-tpl="46"]').first();
  if (posts[0]) setFeatured($, featured, posts[0], true);
  const selectors = ['59', '67', '75', '83', '91', '99'];
  selectors.forEach((id, index) => { const card = $(`[data-dc-tpl="${id}"]`).first(); if (posts[index + 1]) setPostCard($, card, posts[index + 1], true); });
  paginate($, $('[data-dc-tpl="107"]').first(), `/category/${referenceSlug(category)}`, currentPage, totalPosts, perPage);
}

export function mutateAuthor($: cheerio.CheerioAPI, user: UserProfile, posts: any[], currentPage = 1, totalPosts = posts.length, perPage = 7) {
  setText($, '[data-dc-tpl="46"]', user?.name);
  setText($, '[data-dc-tpl="47"]', [user?.role, user?.location].filter(Boolean).join(' · '));
  setText($, '[data-dc-tpl="48"]', user?.bio);
  setImage($, $('[data-dc-tpl="44"]').first(), user?.avatar, user?.avatarAlt || user?.name);
  const featured = $('[data-dc-tpl="50"]').first();
  if (posts[0]) setFeatured($, featured, posts[0], false);
  ['60', '65', '70', '75', '80', '85'].forEach((id, index) => { const card = $(`[data-dc-tpl="${id}"]`).first(); if (posts[index + 1]) setPostCard($, card, posts[index + 1], false); });
  paginate($, $('[data-dc-tpl="90"]').first(), `/author/${referenceSlug(user)}`, currentPage, totalPosts, perPage);
  $('[data-dc-tpl="42"]').attr('data-user-document', user?._sys?.filename || referenceSlug(user));
}

export function mutateArticle($: cheerio.CheerioAPI, post: any, user: UserProfile | null, related: any[] = []) {
  setText($, '[data-dc-tpl="45"]', post?.title);
  const categoryAnchor = $('[data-dc-tpl="44"]').first();
  const categories = (Array.isArray(post?.categories) ? post.categories : [post?.categories]).filter(Boolean);
  $('[data-article-category], [data-article-description], [data-article-updated]').remove();
  if (categories[0]) categoryAnchor.text(referenceLabel(categories[0])).attr('href', `/category/${referenceSlug(categories[0])}/`);
  const authorLink = $('[data-dc-tpl="47"]').first().attr('href', `/author/${referenceSlug(user || post?.author)}/`);
  replaceDirectText($, authorLink, user?.name || referenceLabel(post?.author) || 'Commercial Daily News');
  setImage($, $('[data-dc-tpl="48"]').first(), user?.avatar, post?.authorAlt || user?.avatarAlt || user?.name);
  setText($, '[data-dc-tpl="49"]', formatDate(post?.pubDate));
  setText($, '[data-dc-tpl="50"]', post?.readTime || '');
  setImage($, $('[data-dc-tpl="54"]').first(), post?.heroImage, post?.heroImageAlt || post?.title);
  const body = $('[data-dc-tpl="79"]').first();
  const sourceNodes = body.children().toArray();
  const standardParagraph = sourceNodes.find((node, index) => String(node.tagName || '').toLowerCase() === 'p' && index > 0);
  const prototypes: Record<string, string | undefined> = {
    p: standardParagraph ? $(standardParagraph).attr('style') : body.find('p').first().attr('style'),
    h2: body.find('h2').first().attr('style'),
    h3: body.find('h2').first().attr('style'),
    blockquote: body.find('blockquote').first().attr('style'),
  };
  if (post?.body) {
    const rendered = $('<div>').html(richBodyHtml(post.body, prototypes));
    const values = rendered.children().toArray();
    sourceNodes.forEach((node, index) => {
      const value = values[index];
      if (!value) return;
      const target = $(node);
      target.html($(value).html() || '');
      if (/^h[1-6]$/i.test(String(node.tagName || ''))) {
        const id = $(value).attr('id') || referenceSlug(target.text());
        if (id) target.attr('id', id);
      }
    });
  }
  setText($, '[data-dc-tpl="97"]', user?.name);
  setText($, '[data-dc-tpl="98"]', user?.bio);
  setImage($, $('[data-dc-tpl="94"]').first(), user?.avatar, user?.avatarAlt || user?.name);
  const authorBox = $('[data-dc-tpl="93"]').first();
  if (authorBox.length) body.after(authorBox);
  const headings = body.find('h2').toArray();
  const toc = $('[data-dc-tpl="103"]').first();
  const tocRows = toc.children('li').toArray();
  headings.slice(0, tocRows.length).forEach((node, index) => {
    const title = $(node).text().trim(); const id = $(node).attr('id') || referenceSlug(title); $(node).attr('id', id);
    const row = $(tocRows[index]);
    const link = row.find('a').first().attr('href', `#${id}`);
    const spans = link.find('span').toArray();
    if (spans[0]) $(spans[0]).text(`${index + 1}.`);
    if (spans[1]) $(spans[1]).text(title);
  });
  $('head').append(`<style id="cdn-article-mobile-order">@media(max-width:959px){[data-dc-tpl="51"]{flex-direction:column!important}[data-dc-tpl="52"],[data-dc-tpl="99"]{display:contents!important}[data-dc-tpl="53"]{order:1}[data-dc-tpl="101"]{order:2}[data-dc-tpl="79"]{order:3}[data-dc-tpl="93"]{order:4}[data-dc-tpl="124"]{order:5}}</style>`);
  const relatedCards = $('[data-dc-tpl="133"], [data-dc-tpl="137"], [data-dc-tpl="141"]').toArray();
  relatedCards.forEach((node, index) => {
    const item = related[index]; if (!item) return;
    const card = $(node).attr('href', postUrl(item));
    setImage($, card.find('img').first(), item.heroImage, item.heroImageAlt || item.title);
    const spans = card.find('span').toArray();
    if (spans[0]) $(spans[0]).text(referenceLabel(item.categories));
    if (spans[1]) $(spans[1]).text(item.title || '');
  });
  const authorSlug = referenceSlug(user || post?.author);
  authorBox.attr('data-user-document', user?._sys?.filename || authorSlug);
  $('[data-dc-tpl="42"]').attr('data-blog-document', post?._sys?.filename || referenceSlug(post?.title));
}
