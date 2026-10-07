import { CategorySection, CurationSection, EditorialSection, FeaturedSection, HeroSection } from '@/components/home';
import { useAsync } from '@/hooks/useAsync';
import { categoryService, editorialService, productService } from '@/services';

// Homepage. All data comes through '@/services', so swapping the mock source for Supabase needs no change here.
export default function HomePage() {
  // One fetch feeds two sections: the first curated piece is the cover, the next four are the picks.
  const featured = useAsync(() => productService.listProducts({ featured: true, limit: 5 }), []);
  const categories = useAsync(() => categoryService.listCategories(), []);
  const stories = useAsync(() => editorialService.listArticles({ limit: 3 }), []);

  const [cover, ...picks] = featured.data ?? [];

  return (
    <>
      <HeroSection piece={cover} loading={featured.loading} />
      <FeaturedSection products={picks} loading={featured.loading} error={featured.error} onRetry={featured.reload} />
      <CategorySection categories={categories.data ?? []} loading={categories.loading} />
      <CurationSection />
      <EditorialSection articles={stories.data ?? []} loading={stories.loading} error={stories.error} onRetry={stories.reload} />
    </>
  );
}
