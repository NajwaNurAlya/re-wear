import { categories } from './seed';
import { isPublic } from './productService';
import { listAllProducts } from './productService';

/** All categories with the number of public pieces in each. */
export async function listCategories() {
  const products = await listAllProducts();
  return categories.map((c) => ({
    ...c,
    productCount: products.filter((p) => p.categoryId === c.id && isPublic(p)).length,
  }));
}

/** One category by id, or null. */
export async function getCategory(id) {
  return categories.find((c) => c.id === id) ?? null;
}
