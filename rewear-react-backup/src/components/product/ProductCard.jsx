import { Link } from 'react-router-dom';
import ImagePlaceholder from '@/components/ui/ImagePlaceholder';
import { HeartIcon } from '@/components/ui/icons';
import StatusBadge from '@/components/ui/StatusBadge';
import ProductBadge from '@/components/product/ProductBadge';
import { CONDITIONS, PRODUCT_STATUS, labelOf } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { formatRupiah } from '@/lib/format';
import { cx } from '@/lib/cx';

/**
 * Product shape the UI expects (the mock and Supabase adapters both return this):
 * { id, title, price, images: string[], brand?, size?, era?, condition?, status }
 *
 * Whole card is one link (the title, stretched). The wishlist button and `actions`
 * sit above it, so there are no nested interactive elements.
 */
export default function ProductCard({
  product,
  wishlisted = false,
  onToggleWishlist,
  showStatus = false,
  actions,
  priority = false,
  className,
}) {
  const { id, title, price, images = [], brand, size, era, condition, status } = product;
  const sold = status === PRODUCT_STATUS.SOLD;
  const [cover, alt] = images;

  return (
    <article
      className={cx(
        'group relative flex flex-col outline-dark-brown has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4',
        className
      )}
    >
      <div className="product-photo relative aspect-[4/5] overflow-hidden">
        {cover ? (
          <>
            <img
              src={cover}
              alt=""
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              className={cx(
                'absolute inset-0 size-full object-cover transition-opacity duration-300',
                alt && 'group-hover:opacity-0',
                sold && 'opacity-60'
              )}
            />
            {alt && (
              // Second photo on hover, the way editorial shops show the back or a detail.
              <img src={alt} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            )}
          </>
        ) : (
          <ImagePlaceholder />
        )}

        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          {size && <ProductBadge>{size}</ProductBadge>}
          {era && <ProductBadge>{era}</ProductBadge>}
        </div>
        {sold && <ProductBadge tone="strong" className="absolute top-2 left-2">Sold</ProductBadge>}

        {onToggleWishlist && (
          <button
            type="button"
            aria-pressed={wishlisted}
            aria-label={`${wishlisted ? 'Remove' : 'Save'} ${title} ${wishlisted ? 'from' : 'to'} wishlist`}
            onClick={() => onToggleWishlist(product)}
            className="absolute top-2 right-2 z-10 grid size-10 place-items-center bg-cream/90 text-dark-brown transition-colors hover:bg-cream"
          >
            <HeartIcon size={20} filled={wishlisted} />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1">
        {brand && <p className="text-meta">{brand}</p>}
        <h3 className="font-serif text-lg leading-snug font-medium">
          <Link
            to={ROUTES.product(id)}
            className="underline-offset-4 decoration-transparent group-hover:underline group-hover:decoration-dark-brown after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {title}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
          <span className={cx('font-medium', sold && 'text-brown line-through')}>{formatRupiah(price)}</span>
          {condition && <span className="text-meta">{labelOf(CONDITIONS, condition)}</span>}
        </p>
        {showStatus && status && <StatusBadge status={status} className="mt-1 self-start" />}
      </div>

      {actions && <div className="relative z-10 mt-3 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <div className="aspect-[4/5] animate-pulse bg-beige" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-1/3 animate-pulse bg-beige" />
        <div className="h-5 w-4/5 animate-pulse bg-beige" />
        <div className="h-4 w-1/2 animate-pulse bg-beige" />
      </div>
    </div>
  );
}
