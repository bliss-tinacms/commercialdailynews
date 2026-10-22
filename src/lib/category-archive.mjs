export function categorySlug(reference) {
  const value = typeof reference === 'string'
    ? reference
    : reference?.category
      ?? reference?._sys?.path
      ?? reference?._sys?.relativePath
      ?? reference?._sys?.filename
      ?? reference?.slug
      ?? reference?.name
      ?? reference?.title
      ?? '';
  const leaf = String(value).split('/').filter(Boolean).pop()?.replace(/\.(json|mdx?)$/i, '') || '';
  return leaf.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function postCategorySlugs(post) {
  const stored = Array.isArray(post?.categories)
    ? post.categories
    : post?.categories
      ? [post.categories]
      : Array.isArray(post?.category)
        ? post.category
        : post?.category
          ? [post.category]
          : [];
  return stored.map(categorySlug).filter(Boolean);
}

export function filterPostsByCategory(posts, activeCategory) {
  const activeSlug = categorySlug(activeCategory);
  if (!activeSlug) return [];
  return (Array.isArray(posts) ? posts : []).filter((post) => postCategorySlugs(post).includes(activeSlug));
}

export function paginateCategoryPosts(posts, page, perPage) {
  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedPerPage = Math.max(1, Number(perPage) || 1);
  const start = (normalizedPage - 1) * normalizedPerPage;
  return posts.slice(start, start + normalizedPerPage);
}
