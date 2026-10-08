import { ARTICLE_STATUS } from '@/constants';
import { articles } from './seed';

const byNewest = (a, b) => b.publishedAt.localeCompare(a.publishedAt);
const STORAGE_KEY = 'rewear.articles';
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Lists return summaries only. The full body is fetched with getArticle().
const summary = ({ body, relatedProductIds, ...rest }) => rest;
const copyBlocks = (body) => (body ?? []).map((b) => ({ ...b }));
const copy = (article) => article ? { ...article, body: copyBlocks(article.body), relatedProductIds: [...(article.relatedProductIds ?? [])] } : null;
const withDefaults = (article) => {
  const isPublished = article.isPublished ?? (article.status ? article.status === ARTICLE_STATUS.PUBLISHED : true);
  const archivedAt = article.archivedAt ?? null;
  return {
    ...article,
    id: article.id ?? article.slug,
    status: archivedAt ? ARTICLE_STATUS.ARCHIVED : isPublished ? ARTICLE_STATUS.PUBLISHED : ARTICLE_STATUS.DRAFT,
    isPublished,
    archivedAt,
    relatedProductIds: article.relatedProductIds ?? [],
  };
};

function readStored() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeStored(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function allArticles() {
  const merged = new Map(articles.map((article) => [article.id ?? article.slug, withDefaults(article)]));
  for (const article of readStored()) merged.set(article.id, withDefaults(article));
  return [...merged.values()];
}

function slugify(value) {
  const slug = String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `article-${Date.now().toString(36)}`;
}

function uniqueSlug(title, currentId) {
  const base = slugify(title);
  const used = new Set(allArticles().filter((a) => a.id !== currentId).map((a) => a.slug));
  let slug = base;
  let i = 2;
  while (used.has(slug)) slug = `${base}-${i++}`;
  return slug;
}

async function coverData(cover) {
  if (cover?.remove) return null;
  if (!cover?.file) return cover?.url ?? cover ?? null;
  if (!PHOTO_TYPES.includes(cover.file.type)) throw new Error('Cover image must be JPG, PNG or WebP.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The cover image could not be saved. Please try again.'));
    reader.readAsDataURL(cover.file);
  });
}

function validate(values) {
  if (!values?.title?.trim()) throw new Error('Title is required.');
  if (!values?.topic?.trim()) throw new Error('Category is required.');
  if (!values?.author?.trim()) throw new Error('Author is required.');
  if (!values?.body?.some((block) => block.text?.trim())) throw new Error('Content is required.');
}

async function normalizePayload(values, current, publishing = false) {
  validate(values, publishing);
  const now = new Date().toISOString();
  const cover = await coverData(values.cover);
  return {
    id: current?.id ?? `article-${Date.now().toString(36)}`,
    slug: current?.slug ?? uniqueSlug(values.title),
    title: values.title.trim(),
    topic: values.topic.trim(),
    author: values.author.trim(),
    excerpt: values.excerpt?.trim() ?? '',
    cover,
    body: (values.body ?? []).filter((block) => block.text?.trim()).map((block) => ({ type: block.type, text: block.text.trim() })),
    relatedProductIds: Array.isArray(values.relatedProductIds) ? values.relatedProductIds : [],
    publishedAt: values.publishedAt ?? current?.publishedAt ?? now.slice(0, 10),
    isPublished: current?.isPublished ?? false,
    archivedAt: current?.archivedAt ?? null,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
}

/** Newest first. { limit, excludeSlug } */
export async function listArticles({ limit, excludeSlug } = {}) {
  const list = allArticles()
    .filter((a) => a.isPublished && !a.archivedAt && a.slug !== excludeSlug)
    .sort(byNewest)
    .map(summary);
  return limit ? list.slice(0, limit) : list;
}

/** Full article by slug, or null when there is none. */
export async function getArticle(slug) {
  const found = allArticles().find((a) => a.slug === slug && a.isPublished && !a.archivedAt);
  return copy(found);
}

export async function listAllArticles() {
  return allArticles().sort((a, b) => String(b.updatedAt ?? b.publishedAt).localeCompare(String(a.updatedAt ?? a.publishedAt))).map(summary);
}

export async function getArticleForAdmin(id) {
  return copy(allArticles().find((a) => a.id === id || a.slug === id));
}

export async function createArticle(values, { publish = false } = {}) {
  const article = await normalizePayload(values, null, publish);
  if (publish) {
    article.isPublished = true;
    article.publishedAt = new Date().toISOString().slice(0, 10);
  }
  writeStored([article, ...readStored()]);
  return copy(withDefaults(article));
}

export async function updateArticle(id, values, { publish = false } = {}) {
  const current = await getArticleForAdmin(id);
  if (!current) throw new Error('Article not found.');
  const article = await normalizePayload(values, current, publish);
  article.isPublished = publish || values.status === ARTICLE_STATUS.PUBLISHED;
  article.archivedAt = values.status === ARTICLE_STATUS.ARCHIVED ? (current.archivedAt ?? new Date().toISOString()) : null;
  if (publish && !current.isPublished) article.publishedAt = new Date().toISOString().slice(0, 10);
  const stored = readStored();
  writeStored(stored.some((item) => item.id === id || item.slug === id) ? stored.map((item) => (item.id === id || item.slug === id ? article : item)) : [article, ...stored]);
  return copy(withDefaults(article));
}

export async function publishArticle(id) {
  const article = await getArticleForAdmin(id);
  if (!article) throw new Error('Article not found.');
  validate(article, true);
  return updateArticle(id, { ...article, status: ARTICLE_STATUS.PUBLISHED }, { publish: true });
}

export async function unpublishArticle(id) {
  const article = await getArticleForAdmin(id);
  if (!article) throw new Error('Article not found.');
  return updateArticle(id, { ...article, status: ARTICLE_STATUS.DRAFT });
}

export async function archiveArticle(id) {
  const article = await getArticleForAdmin(id);
  if (!article) throw new Error('Article not found.');
  return updateArticle(id, { ...article, status: ARTICLE_STATUS.ARCHIVED });
}
