import SectionHeader from '@/components/common/SectionHeader';
import ProductGrid from '@/components/product/ProductGrid';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { ROUTES } from '@/constants/routes';

export default function FeaturedSection({ products, loading, error, onRetry }) {
  return (
    <section aria-labelledby="featured-title" className="container-page pb-16 md:pb-24">
      <SectionHeader
        id="featured-title"
        title="Curator’s picks"
        description="A short list of recently approved pieces. Each one is photographed with its label and graded for condition."
        action={{ label: 'See all pieces', to: ROUTES.explore }}
      />

      <div className="mt-10 md:mt-12">
        {error ? (
          <EmptyState
            compact
            title="The picks could not be loaded"
            description="Check your connection and try again."
            action={<Button variant="secondary" onClick={onRetry}>Try again</Button>}
          />
        ) : (
          <ProductGrid
            columns="quad"
            products={products}
            loading={loading}
            skeletonCount={4}
            empty={
              <EmptyState
                compact
                title="No curated pieces yet"
                description="New pieces are approved every week. Browse everything in the meantime."
                action={<Button to={ROUTES.explore} variant="secondary">Explore</Button>}
              />
            }
          />
        )}
      </div>
    </section>
  );
}
