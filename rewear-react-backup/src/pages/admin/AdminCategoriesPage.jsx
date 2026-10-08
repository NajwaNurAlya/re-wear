import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { categoryService, productService } from '@/services';

export default function AdminCategoriesPage() {
  const { data, loading, error } = useAsync(async () => Promise.all([categoryService.listCategories(), productService.listAllProducts()]), []);
  const categories = data?.[0] ?? [];
  const products = data?.[1] ?? [];

  return (
    <section className="container-page py-8 md:py-12" aria-labelledby="categories-title">
      <p className="text-meta uppercase tracking-[0.16em]">Curator desk</p>
      <h1 id="categories-title" className="display-md mt-2">The rack, by category.</h1>
      <p className="mt-3 max-w-2xl text-brown">A small taxonomy keeps browsing thoughtful and makes every find easier to place.</p>
      <div className="mt-8 border-t border-beige pt-8">
        {error ? <EmptyState title="Categories could not be loaded" description="Try refreshing the page." /> : loading ? <p className="py-8 text-brown">Loading categories…</p> : (
          <ul className="grid gap-px border border-beige bg-beige sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
              const count = products.filter((product) => product.categoryId === category.id).length;
              return (
                <li key={category.id} className="flex min-h-52 flex-col bg-cream p-5 md:p-6">
                  <p className="text-meta uppercase tracking-[0.14em]">{String(count).padStart(2, '0')} {count === 1 ? 'piece' : 'pieces'}</p>
                  <h2 className="font-serif text-2xl mt-3">{category.name}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-brown">{category.description || 'A place for considered preloved finds.'}</p>
                  <Link to={ROUTES.exploreWith({ category: category.slug ?? category.id })} className="link-underline mt-4 self-start text-sm">Browse this category</Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-brown">Categories are a fixed taxonomy. Counts include every piece in the category, whatever its status. Changes are made in the database.</p>
    </section>
  );
}
