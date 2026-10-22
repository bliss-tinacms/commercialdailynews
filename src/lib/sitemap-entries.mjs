const slash = (value) => value === '/' ? '/' : `/${String(value || '').replace(/^\/+|\/+$/g, '')}/`;

const isPublished = (item) => item && item.draft !== true && item?.seo?.noindex !== true;

export function buildSitemapSections({ pages = [], posts = [], pageHref, postHref } = {}) {
  if (typeof pageHref !== 'function' || typeof postHref !== 'function') {
    throw new TypeError('pageHref and postHref are required');
  }

  const pageItems = pages
    .filter(isPublished)
    .filter((page) => !['404', 'sitemap'].includes(String(page?._sys?.filename || '').toLowerCase()))
    .map((page) => ({ title: String(page.title || '').trim(), href: slash(pageHref(page)) }))
    .filter((item) => item.title && item.href);

  const postItems = posts
    .filter(isPublished)
    .map((post) => ({ title: String(post.title || '').trim(), href: slash(postHref(post)) }))
    .filter((item) => item.title && item.href);

  return [
    { heading: 'Pages', items: pageItems },
    { heading: 'Posts', items: postItems },
  ];
}
