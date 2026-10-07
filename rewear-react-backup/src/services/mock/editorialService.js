import { articles } from './seed';

const byNewest = (a, b) => b.publishedAt.localeCompare(a.publishedAt);

// Lists return summaries only. The full body is fetched with getArticle().
const summary = ({ body, relatedProductIds, ...rest }) => rest;

/** Newest first. { limit, excludeSlug } */
export async function listArticles({ limit, excludeSlug } = {}) {
  const list = articles.filter((a) => a.slug !== excludeSlug).sort(byNewest).map(summary);
  return limit ? list.slice(0, limit) : list;
}

/** Full article by slug, or null when there is none. */
export async function getArticle(slug) {
  const found = articles.find((a) => a.slug === slug);
  return found ? { ...found, body: found.body.map((b) => ({ ...b })) } : null;
}
