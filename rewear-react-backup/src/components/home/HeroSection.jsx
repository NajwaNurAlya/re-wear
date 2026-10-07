import { Link } from 'react-router-dom';
import ProductBadge from '@/components/product/ProductBadge';
import Button from '@/components/ui/Button';
import ImagePlaceholder from '@/components/ui/ImagePlaceholder';
import { CONDITIONS, labelOf } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { formatRupiah } from '@/lib/format';

// The cover piece: one curated product shown large, with its hang-tag and a line of its history.
function CoverPiece({ piece, loading }) {
  if (loading) {
    return (
      <div aria-hidden="true">
        <div className="aspect-[4/5] animate-pulse bg-beige" />
        <div className="relative z-10 -mt-12 mr-6 ml-4 border border-beige bg-cream p-4">
          <div className="h-4 w-2/3 animate-pulse bg-beige" />
          <div className="mt-3 h-10 w-full animate-pulse bg-beige" />
        </div>
      </div>
    );
  }
  if (!piece) return null;

  const { id, title, brand, price, size, era, condition, story, images = [] } = piece;
  return (
    <article className="group relative outline-dark-brown has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4">
      <div className="product-photo relative aspect-[4/5] overflow-hidden">
        {images[0] ? (
          <img
            src={images[0]}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 ease-soft group-hover:scale-[1.02]"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      {/* The hang-tag */}
      <div className="relative z-10 -mt-12 mr-6 ml-4 border border-dark-brown bg-cream p-4 md:mr-8 md:ml-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {size && <ProductBadge>{size}</ProductBadge>}
          {era && <ProductBadge>{era}</ProductBadge>}
          {condition && <span className="text-meta">{labelOf(CONDITIONS, condition)}</span>}
        </div>
        <h2 className="mt-3 font-serif text-xl leading-snug font-medium">
          <Link
            to={ROUTES.product(id)}
            className="underline-offset-4 decoration-transparent group-hover:underline group-hover:decoration-dark-brown after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {title}
          </Link>
        </h2>
        {story && <p className="mt-2 font-serif text-[0.9375rem] leading-relaxed text-brown italic">{story}</p>}
        <p className="mt-3 flex items-baseline justify-between gap-4 border-t border-beige pt-3 text-sm">
          <span className="text-meta">{brand}</span>
          <span className="font-medium">{formatRupiah(price)}</span>
        </p>
      </div>
    </article>
  );
}

export default function HeroSection({ piece, loading }) {
  const showCover = loading || piece;

  return (
    <section aria-labelledby="hero-title" className="container-page pt-10 pb-16 md:pt-14 md:pb-24">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8 lg:pt-4">
          <h1
            id="hero-title"
            className="font-serif text-[length:clamp(2.5rem,12.4vw,6rem)] leading-[0.94] font-medium tracking-[-0.025em] lg:text-[length:clamp(4.5rem,8.2vw,7rem)]"
          >
            FIND PIECES
            <br />
            WITH A PAST.
          </h1>

          <div className="mt-10 max-w-lg border-t border-dark-brown pt-6 md:mt-14">
            <p className="text-lg leading-relaxed">
              Vintage and preloved clothing, reviewed one piece at a time. A curator checks every item and lists it with
              its era, size and honest condition, so you know what you are buying.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Button to={ROUTES.explore} size="lg">Explore the collection</Button>
              <Link to={ROUTES.editorial} className="link-underline py-2 font-medium">Read the editorial</Link>
            </div>
          </div>
        </div>

        {showCover && (
          <div className="mx-auto w-full max-w-sm lg:col-span-4 lg:mt-2 lg:max-w-none">
            <CoverPiece piece={piece} loading={loading} />
          </div>
        )}
      </div>
    </section>
  );
}
