import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import ProductGrid from '@/components/product/ProductGrid';
import { ROUTES } from '@/constants/routes';
import { useWishlist } from '@/hooks/useWishlist';

export default function WishlistPage() {
  const wishlist = useWishlist();
  const products = wishlist.items.map(({ image, ...item }) => ({
    ...item,
    images: image ? [image] : [],
  }));

  return (
    <section className="container-page py-10 md:py-14" aria-labelledby="wishlist-title">
      <p className="text-meta uppercase tracking-[0.16em]">Your RE:WEAR edit</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="wishlist-title" className="display-lg mt-2">Pieces to come back to</h1>
          <p className="mt-3 max-w-xl text-brown">Keep the finds you love close. Since every piece is one of a kind, saved items may not be here for long.</p>
        </div>
        {wishlist.count > 0 && <p className="text-sm text-brown">{wishlist.count} {wishlist.count === 1 ? 'piece' : 'pieces'} saved</p>}
      </div>

      <div className="mt-8 border-t border-beige pt-8">
        <ProductGrid
          products={products}
          wishlistIds={wishlist.ids}
          onToggleWishlist={(product) => wishlist.remove(product.id)}
          empty={(
            <EmptyState
              title="No saved pieces yet."
              description="Browse the rack and tap the heart on anything you would like to remember."
              action={<Button to={ROUTES.explore}>Explore the collection</Button>}
            />
          )}
        />
      </div>
    </section>
  );
}
