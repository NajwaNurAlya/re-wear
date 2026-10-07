import EmptyState from '@/components/ui/EmptyState';
import ProductCard, { ProductCardSkeleton } from '@/components/product/ProductCard';
import { cx } from '@/lib/cx';

// 'default' for full-width pages, 'withSidebar' when a filter column sits beside the grid, 'quad' for four-up rows.
const COLUMNS = {
  default: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  withSidebar: 'grid-cols-2 md:grid-cols-3',
  // Rows of exactly four (homepage picks): 2 up, then 4 up, with no orphan card in between.
  quad: 'grid-cols-2 lg:grid-cols-4',
};

/**
 * <ProductGrid products={items} loading={loading} wishlistIds={ids} onToggleWishlist={toggle} />
 * `wishlistIds` can be a Set or an array of product ids.
 * `renderActions(product)` adds per-card buttons (seller and admin lists).
 */
export default function ProductGrid({
  products = [],
  loading = false,
  skeletonCount = 8,
  columns = 'default',
  wishlistIds,
  onToggleWishlist,
  showStatus = false,
  renderActions,
  empty,
  className,
}) {
  const isWishlisted = (id) =>
    wishlistIds instanceof Set ? wishlistIds.has(id) : Array.isArray(wishlistIds) && wishlistIds.includes(id);

  if (!loading && products.length === 0) {
    return empty ?? <EmptyState title="No pieces found" description="Try removing a filter or searching for something else." />;
  }

  return (
    <>
      <ul role="list" aria-busy={loading || undefined} className={cx('grid gap-x-4 gap-y-10 md:gap-x-6', COLUMNS[columns], className)}>
        {loading
          ? Array.from({ length: skeletonCount }, (_, i) => (
              <li key={i}><ProductCardSkeleton /></li>
            ))
          : products.map((product, i) => (
              <li key={product.id}>
                <ProductCard
                  product={product}
                  priority={i < 4}
                  wishlisted={isWishlisted(product.id)}
                  onToggleWishlist={onToggleWishlist}
                  showStatus={showStatus}
                  actions={renderActions?.(product)}
                />
              </li>
            ))}
      </ul>
      {/* Outside the list: a <ul> may only contain list items. */}
      {loading && <p className="sr-only" role="status">Loading pieces</p>}
    </>
  );
}
