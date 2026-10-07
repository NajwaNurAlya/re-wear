import { useState } from 'react';
import ImagePlaceholder from '@/components/ui/ImagePlaceholder';
import { ChevronIcon } from '@/components/ui/icons';
import { cx } from '@/lib/cx';

/**
 * <ProductGallery images={product.images} title={product.title}><ProductBadge tone="strong">Sold</ProductBadge></ProductGallery>
 * Children render over the top-left corner of the main photo.
 * Arrow keys move between photos once focus is inside the gallery.
 * Tip: pass key={product.id} so the gallery resets to photo 1 when the product changes.
 */
export default function ProductGallery({ images = [], title = 'Product', children, className }) {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const current = Math.min(index, Math.max(count - 1, 0));
  const go = (i) => setIndex((i + count) % count);

  const handleKeyDown = (e) => {
    if (count < 2) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
  };

  const arrow = 'absolute top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center bg-cream/90 text-dark-brown hover:bg-cream';

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={`${title} photos`}
      onKeyDown={handleKeyDown}
      className={cx('grid gap-3 lg:grid-cols-[5rem_1fr]', className)}
    >
      <div className="product-photo relative aspect-[4/5] overflow-hidden lg:col-start-2 lg:row-start-1">
        {count > 0 ? (
          <img
            key={images[current]}
            src={images[current]}
            alt={`${title}, photo ${current + 1} of ${count}`}
            className="size-full object-cover"
          />
        ) : (
          <ImagePlaceholder />
        )}

        {children && <div className="absolute top-3 left-3">{children}</div>}

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(current - 1)} aria-label="Previous photo" className={cx(arrow, 'left-2')}>
              <ChevronIcon direction="left" />
            </button>
            <button type="button" onClick={() => go(current + 1)} aria-label="Next photo" className={cx(arrow, 'right-2')}>
              <ChevronIcon direction="right" />
            </button>
            <p aria-hidden="true" className="absolute right-2 bottom-2 bg-cream/90 px-2 py-0.5 text-xs">
              {current + 1} / {count}
            </p>
            <p className="sr-only" aria-live="polite">Photo {current + 1} of {count}</p>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:col-start-1 lg:row-start-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {images.map((src, i) => (
            <li key={src} className="w-16 shrink-0 lg:w-full">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === current ? 'true' : undefined}
                className={cx(
                  'block aspect-[4/5] w-full overflow-hidden border-2 transition-opacity',
                  i === current ? 'border-dark-brown' : 'border-transparent opacity-70 hover:opacity-100'
                )}
              >
                <img src={src} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
