// Supabase category adapter (Step 3A). Same functions and shapes as services/mock/categoryService.js:
//
//   listCategories()   -> [{ id, slug, name, description, sortOrder, productCount }]   (productCount = approved pieces)
//   getCategory(key)   -> { id, slug, name, description, sortOrder } | null            (key = uuid or slug)
//
// `categories` is public-read under RLS, so these work for anonymous visitors. IDs are UUIDs here, which is why
// links and URLs should prefer `slug` (Explore resolves id, slug or name through lib/filters.resolveCategoryId).
import { PRODUCT_STATUS } from '@/constants';
import { supabase } from './client';

const COLUMNS = 'id, slug, name, description, sort_order';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function mapCategory(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    sortOrder: row.sort_order ?? 0,
  };
}

function fail(error) {
  if (import.meta.env.DEV) console.warn('[supabase categories]', error?.code ?? error?.name, error?.message);
  const wrapped = new Error('Categories could not be loaded right now. Please try again.');
  wrapped.code = error?.code;
  wrapped.cause = error;
  return wrapped;
}

/** All categories in curated order, each with the number of approved (publicly visible) pieces. */
export async function listCategories() {
  const client = requireClient();
  const { data, error } = await client
    .from('categories')
    .select(COLUMNS)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw fail(error);

  const categories = (data ?? []).map(mapCategory);
  // One exact head-count per category: no row transfer and no 1000-row API cap. The taxonomy is small by design.
  const counts = await Promise.all(
    categories.map(async (category) => {
      const { count, error: countError } = await client
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', category.id)
        .eq('status', PRODUCT_STATUS.APPROVED);
      if (countError) throw fail(countError);
      return count ?? 0;
    })
  );
  return categories.map((category, index) => ({ ...category, productCount: counts[index] }));
}

/** One category by uuid or slug, or null (also for a missing/unknown/legacy id such as "cat-tops"). */
export async function getCategory(key) {
  if (!key || typeof key !== 'string') return null;
  const client = requireClient();
  const { data, error } = await client
    .from('categories')
    .select(COLUMNS)
    .eq(UUID.test(key) ? 'id' : 'slug', key.trim().toLowerCase())
    .maybeSingle();
  if (error) throw fail(error);
  return data ? mapCategory(data) : null;
}
