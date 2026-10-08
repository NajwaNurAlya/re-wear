import { categories } from './seed';
import { isPublic, listAllProducts } from './productService';

/** All categories in curated order, each with the number of public pieces in it. */
export async function listCategories() {
  const products = await listAllProducts();
  return [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      ...c,
      productCount: products.filter((p) => p.categoryId === c.id && isPublic(p)).length,
    }));
}

/** One category by id or slug, or null. Same contract as the Supabase adapter. */
export async function getCategory(key) {
  if (!key) return null;
  return categories.find((c) => c.id === key || c.slug === key) ?? null;
}
