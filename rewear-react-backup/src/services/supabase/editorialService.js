// Supabase editorial adapter (Step 3B). Same functions and shapes as services/mock/editorialService.js:
//
//   listArticles({ limit, excludeSlug })  -> [{ id, slug, title, topic, author, publishedAt, excerpt, cover }]  newest first
//   getArticle(slug)                      -> summary + { body: [{ type, text }], relatedProductIds: [uuid] } | null
//
// Public pages only ever see published articles (the filter is explicit even though RLS also hides drafts from visitors).
// `relatedProductIds` keeps the editor's order; the page resolves them through productService.
import { ARTICLE_STATUS } from '@/constants';
import { supabase } from './client';

const SUMMARY = 'id, slug, title, topic, author, excerpt, cover_image, published_at, is_published, archived_at, created_at, updated_at';
const BLOCK_TYPES = new Set(['p', 'h2', 'quote']);
const PHOTO_BUCKET = 'product-images';
const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function fail(error) {
  if (import.meta.env.DEV) console.warn('[supabase editorial]', error?.code ?? error?.name, error?.message);
  const wrapped = new Error('Stories could not be loaded right now. Please try again.');
  wrapped.code = error?.code;
  wrapped.cause = error;
  return wrapped;
}

function mapSummary(row) {
  const archivedAt = row.archived_at ?? null;
  const isPublished = Boolean(row.is_published);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    topic: row.topic,
    author: row.author,
    publishedAt: row.published_at,
    excerpt: row.excerpt ?? '',
    cover: row.cover_image ?? null,
    isPublished,
    archivedAt,
    status: archivedAt ? ARTICLE_STATUS.ARCHIVED : isPublished ? ARTICLE_STATUS.PUBLISHED : ARTICLE_STATUS.DRAFT,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// The body is jsonb written by curators. Anything that is not a known block is dropped rather than rendered blindly.
const cleanBody = (body) =>
  (Array.isArray(body) ? body : [])
    .filter((block) => block && BLOCK_TYPES.has(block.type) && typeof block.text === 'string')
    .map((block) => ({ type: block.type, text: block.text }));

/** Newest first. { limit, excludeSlug } */
export async function listArticles({ limit, excludeSlug } = {}) {
  const client = requireClient();
  let query = client
    .from('articles')
    .select(SUMMARY)
    .eq('is_published', true)
    .is('archived_at', null)
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (excludeSlug) query = query.neq('slug', excludeSlug);
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw fail(error);
  return (data ?? []).map(mapSummary);
}

/** Full article by slug, or null when there is none (or it is not published). */
export async function getArticle(slug) {
  if (!slug || typeof slug !== 'string') return null;
  const client = requireClient();
  const { data, error } = await client
    .from('articles')
    .select(`${SUMMARY}, body, article_products(product_id, position)`)
    .eq('slug', slug.trim())
    .eq('is_published', true)
    .is('archived_at', null)
    .maybeSingle();
  if (error) throw fail(error);
  if (!data) return null;
  const related = [...(data.article_products ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return {
    ...mapSummary(data),
    body: cleanBody(data.body),
    relatedProductIds: related.map((row) => row.product_id),
  };
}

function slugify(value) {
  const slug = String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `article-${Date.now().toString(36)}`;
}

async function uniqueSlug(client, title, currentId) {
  const base = slugify(title);
  let slug = base;
  let i = 2;
  while (true) {
    let query = client.from('articles').select('id').eq('slug', slug).maybeSingle();
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.id === currentId) return slug;
    slug = `${base}-${i++}`;
  }
}

function validate(values) {
  if (!values?.title?.trim()) throw new Error('Title is required.');
  if (!values?.topic?.trim()) throw new Error('Category is required.');
  if (!values?.author?.trim()) throw new Error('Author is required.');
  if (!values?.body?.some((block) => block.text?.trim())) throw new Error('Content is required.');
}

async function uploadCover(client, cover) {
  if (cover?.remove) return null;
  if (!cover?.file) return cover?.url ?? cover ?? null;
  const extension = PHOTO_TYPES[cover.file.type];
  if (!extension) throw new Error('Cover image must be JPG, PNG or WebP.');
  if (cover.file.size > MAX_PHOTO_BYTES) throw new Error('Cover image must be 5 MB or smaller.');
  const path = `editorial/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(PHOTO_BUCKET).upload(path, cover.file, {
    contentType: cover.file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error('The cover image could not be uploaded. Check your connection and try again.');
  return client.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

function storagePathFromPublicUrl(url) {
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    return path.startsWith('editorial/') ? path : null;
  } catch {
    return null;
  }
}

async function cleanupCover(client, previous, next) {
  if (!previous || previous === next) return;
  const path = storagePathFromPublicUrl(previous);
  if (!path) return;
  const { error } = await client.storage.from(PHOTO_BUCKET).remove([path]);
  if (error && import.meta.env.DEV) console.warn('[supabase editorial cover cleanup]', error.message);
}

function payloadFrom(values, cover, slug, publish) {
  const now = new Date().toISOString().slice(0, 10);
  const status = values.status ?? (publish ? ARTICLE_STATUS.PUBLISHED : ARTICLE_STATUS.DRAFT);
  return {
    slug,
    title: values.title.trim(),
    topic: values.topic.trim(),
    author: values.author.trim(),
    excerpt: values.excerpt?.trim() ?? '',
    cover_image: cover,
    body: (values.body ?? []).filter((block) => block.text?.trim()).map((block) => ({ type: block.type, text: block.text.trim() })),
    is_published: publish || status === ARTICLE_STATUS.PUBLISHED,
    archived_at: status === ARTICLE_STATUS.ARCHIVED ? new Date().toISOString() : null,
    published_at: publish || status === ARTICLE_STATUS.PUBLISHED ? (values.publishedAt || now) : (values.publishedAt || now),
  };
}

async function replaceRelatedProducts(client, articleId, ids = []) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const { error: deleteError } = await client.from('article_products').delete().eq('article_id', articleId);
  if (deleteError) throw deleteError;
  if (!uniqueIds.length) return;
  const rows = uniqueIds.map((productId, position) => ({ article_id: articleId, product_id: productId, position }));
  const { error } = await client.from('article_products').insert(rows);
  if (error) throw error;
}

export async function listAllArticles() {
  const client = requireClient();
  const { data, error } = await client
    .from('articles')
    .select(SUMMARY)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw fail(error);
  return (data ?? []).map(mapSummary);
}

export async function getArticleForAdmin(id) {
  if (!id) return null;
  const client = requireClient();
  const { data, error } = await client
    .from('articles')
    .select(`${SUMMARY}, body, article_products(product_id, position)`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw fail(error);
  if (!data) return null;
  const related = [...(data.article_products ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return {
    ...mapSummary(data),
    body: cleanBody(data.body),
    relatedProductIds: related.map((row) => row.product_id),
  };
}

export async function createArticle(values, { publish = false } = {}) {
  const client = requireClient();
  validate(values, publish);
  const cover = await uploadCover(client, values.cover);
  try {
    const slug = await uniqueSlug(client, values.title);
    const payload = payloadFrom(values, cover, slug, publish);
    const { data, error } = await client.from('articles').insert(payload).select(SUMMARY).single();
    if (error) throw error;
    await replaceRelatedProducts(client, data.id, values.relatedProductIds);
    return getArticleForAdmin(data.id);
  } catch (error) {
    await cleanupCover(client, cover, null);
    throw error?.code ? fail(error) : error;
  }
}

export async function updateArticle(id, values, { publish = false } = {}) {
  const client = requireClient();
  const current = await getArticleForAdmin(id);
  if (!current) throw new Error('Article not found.');
  validate(values, publish);
  const cover = await uploadCover(client, values.cover);
  try {
    const slug = current.title === values.title ? current.slug : await uniqueSlug(client, values.title, id);
    const payload = payloadFrom(values, cover, slug, publish);
    const { error } = await client.from('articles').update(payload).eq('id', id);
    if (error) throw error;
    await replaceRelatedProducts(client, id, values.relatedProductIds);
    await cleanupCover(client, current.cover, cover);
    return getArticleForAdmin(id);
  } catch (error) {
    await cleanupCover(client, cover, null);
    throw error?.code ? fail(error) : error;
  }
}

export async function publishArticle(id) {
  const article = await getArticleForAdmin(id);
  if (!article) throw new Error('Article not found.');
  return updateArticle(id, { ...article, cover: article.cover, status: ARTICLE_STATUS.PUBLISHED }, { publish: true });
}

export async function unpublishArticle(id) {
  const article = await getArticleForAdmin(id);
  if (!article) throw new Error('Article not found.');
  return updateArticle(id, { ...article, cover: article.cover, status: ARTICLE_STATUS.DRAFT });
}

export async function archiveArticle(id) {
  const article = await getArticleForAdmin(id);
  if (!article) throw new Error('Article not found.');
  return updateArticle(id, { ...article, cover: article.cover, status: ARTICLE_STATUS.ARCHIVED });
}
