import { Link, useParams } from 'react-router-dom';
import SectionHeader from '@/components/common/SectionHeader';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { ChevronIcon, HeartIcon } from '@/components/ui/icons';
import ProductBadge from '@/components/product/ProductBadge';
import ProductGallery from '@/components/product/ProductGallery';
import ProductGrid from '@/components/product/ProductGrid';
import { CONDITIONS, PRODUCT_STATUS, ROLES, labelOf } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/useToast';
import { useWishlist } from '@/hooks/useWishlist';
import { formatRupiah } from '@/lib/format';
import { categoryService, productService } from '@/services';

const RELATED_COUNT = 4;

// Everything the page needs in one go. Resolves to null when the piece is not public
// (unknown id, or pending / draft / rejected), so those cases share the not-found state.
async function loadProduct(id) {
  const product = await productService.getProduct(id);
  if (!product) return null;
  const [category, related] = await Promise.all([
    categoryService.getCategory(product.categoryId),
    productService.listRelatedProducts(id, { limit: RELATED_COUNT }),
  ]);
  return { product, category, related };
}

function BackLink() {
  return (
    <Link to={ROUTES.explore} className="link-underline inline-flex items-center gap-1 text-sm">
      <ChevronIcon direction="left" size={16} />
      Back to Explore
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      <div className="lg:col-span-7"><div className="aspect-[4/5] animate-pulse bg-beige" /></div>
      <div className="space-y-4 lg:col-span-5">
        <div className="h-3 w-1/4 animate-pulse bg-beige" />
        <div className="h-10 w-4/5 animate-pulse bg-beige" />
        <div className="h-6 w-1/3 animate-pulse bg-beige" />
        <div className="h-12 w-full animate-pulse bg-beige" />
        <div className="h-40 w-full animate-pulse bg-beige" />
      </div>
    </div>
  );
}

function Facts({ rows }) {
  return (
    <dl className="grid grid-cols-[7rem_1fr] gap-x-4 border-t border-beige text-sm sm:grid-cols-[9rem_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="col-span-2 grid grid-cols-subgrid border-b border-beige py-3">
          <dt className="text-brown">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useAsync(() => loadProduct(id), [id]);
  const { user, role } = useAuth();
  const cart = useCart();
  const wishlist = useWishlist();
  const toast = useToast();

  const product = data?.product;
  useDocumentTitle(loading ? 'Loading piece' : product ? product.title : 'Piece not found');

  if (loading) {
    return (
      <section aria-label="Loading piece" className="container-page py-8 md:py-12">
        <BackLink />
        <div className="mt-6"><DetailSkeleton /></div>
        <p className="sr-only" role="status">Loading piece</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="container-page py-8 md:py-12">
        <BackLink />
        <EmptyState
          title="We could not load this piece"
          description="Something went wrong on our side. Please try again."
          action={<Button variant="secondary" onClick={reload}>Try again</Button>}
        />
      </section>
    );
  }

  if (!product) {
    return (
      <section className="container-page py-8 md:py-12">
        <BackLink />
        <EmptyState
          as="h1"
          title="This piece is not available"
          description="It may have been removed, or the link is incorrect. There is plenty more on the rack."
          action={<Button to={ROUTES.explore}>Back to Explore</Button>}
        />
      </section>
    );
  }

  const { category, related } = data;
  const sold = product.status === PRODUCT_STATUS.SOLD;
  const isAdmin = role === ROLES.ADMIN;
  const isOwnPiece = Boolean(user) && product.sellerId === user.id;
  const canBuy = !sold && !isAdmin && !isOwnPiece;
  const inCart = cart.has(product.id);
  const saved = wishlist.has(product.id);
  const measurements = Object.entries(product.measurements ?? {});

  const handleAddToCart = () => {
    const result = cart.add(product);
    if (result.ok) toast.success(`“${product.title}” is in your cart.`, { title: 'Added to cart' });
    else if (result.reason === 'in-cart') toast.info('Every piece is one of a kind, so it is already in your cart.');
    else toast.error('This piece has already been sold.');
  };

  const handleToggleWishlist = (item) => {
    const nowSaved = wishlist.toggle(item);
    toast.info(nowSaved ? `Saved “${item.title}” to your wishlist.` : `Removed “${item.title}” from your wishlist.`, { duration: 3000 });
  };

  const facts = [
    ['Category', category ? <Link to={ROUTES.exploreWith({ category: category.id })} className="link-underline">{category.name}</Link> : '—'],
    [
      'Style',
      product.styles?.length
        ? product.styles.map((s, i) => (
            <span key={s}>
              {i > 0 && ', '}
              <Link to={ROUTES.exploreWith({ style: s })} className="link-underline">{s}</Link>
            </span>
          ))
        : '—',
    ],
    ['Era', product.era ? <Link to={ROUTES.exploreWith({ era: product.era })} className="link-underline">{product.era}</Link> : '—'],
    ['Size', product.size ?? '—'],
    ['Condition', product.condition ? labelOf(CONDITIONS, product.condition) : '—'],
    ['Material', product.material ?? '—'],
  ];

  return (
    <>
      <article className="container-page py-8 md:py-12" aria-labelledby="product-title">
        <BackLink />

        <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <ProductGallery key={product.id} images={product.images} title={product.title}>
              {sold && <ProductBadge tone="strong">Sold</ProductBadge>}
            </ProductGallery>
          </div>

          <div className="lg:col-span-5">
            {product.brand && <p className="text-meta">{product.brand}</p>}
            <h1 id="product-title" className="display-md mt-2">{product.title}</h1>

            <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
              <span className={sold ? 'text-2xl font-medium text-brown line-through' : 'text-2xl font-medium'}>
                {formatRupiah(product.price)}
              </span>
              {sold && <span className="text-sm font-medium">Sold</span>}
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {product.size && <ProductBadge>{product.size}</ProductBadge>}
              {product.era && <ProductBadge>{product.era}</ProductBadge>}
              {product.condition && <ProductBadge>{labelOf(CONDITIONS, product.condition)}</ProductBadge>}
            </div>

            {/* Purchase */}
            <div className="mt-8">
              {sold ? (
                <>
                  <p role="status" className="border border-dark-brown p-4 text-sm">
                    <strong className="font-medium">This piece has found a new home.</strong> Each piece is one of a kind, so it cannot be bought again.
                  </p>
                  <Button disabled fullWidth size="lg" className="mt-3">Sold</Button>
                </>
              ) : (
                <>
                  <p className="text-meta">Quantity: 1 · one of a kind</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    {inCart ? (
                      <Button fullWidth size="lg" disabled>In your cart</Button>
                    ) : (
                      <Button fullWidth size="lg" onClick={handleAddToCart} disabled={!canBuy}>Add to cart</Button>
                    )}
                    {!isAdmin && (
                      <Button
                        variant="secondary"
                        size="lg"
                        aria-pressed={saved}
                        onClick={() => handleToggleWishlist(product)}
                        iconLeft={<HeartIcon size={18} filled={saved} />}
                        className="sm:shrink-0"
                      >
                        {saved ? 'Saved' : 'Save'}
                      </Button>
                    )}
                  </div>
                  {inCart && (
                    <p className="mt-3 text-sm">
                      <Link to={ROUTES.cart} className="link-underline font-medium">View cart</Link>
                    </p>
                  )}
                  {isOwnPiece && <p className="mt-3 text-sm text-brown">This is your own listing, so it cannot be added to a cart.</p>}
                  {isAdmin && <p className="mt-3 text-sm text-brown">Curator accounts browse in view-only mode.</p>}
                </>
              )}
              {sold && !isAdmin && (
                <Button
                  variant="secondary"
                  fullWidth
                  className="mt-3"
                  aria-pressed={saved}
                  onClick={() => handleToggleWishlist(product)}
                  iconLeft={<HeartIcon size={18} filled={saved} />}
                >
                  {saved ? 'Saved' : 'Save for reference'}
                </Button>
              )}
            </div>

            {/* Details */}
            <section aria-labelledby="details-title" className="mt-10">
              <h2 id="details-title" className="title mb-3">Details</h2>
              <Facts rows={facts} />
            </section>

            {measurements.length > 0 && (
              <section aria-labelledby="measurements-title" className="mt-10">
                <h2 id="measurements-title" className="title mb-1">Measurements</h2>
                <p className="text-meta mb-3">In centimetres, laid flat.</p>
                <Facts rows={measurements.map(([label, value]) => [label, `${value} cm`])} />
                <p className="mt-3 text-sm leading-relaxed text-brown">
                  Vintage sizing can vary between makers and eras. Compare these measurements with a piece that fits you well.
                </p>
              </section>
            )}

            <section aria-labelledby="description-title" className="mt-10">
              <h2 id="description-title" className="title mb-3">About this piece</h2>
              <p className="leading-relaxed text-brown">{product.description ?? product.story}</p>
            </section>

            <section aria-labelledby="rewear-standard-title" className="mt-10 border-y border-beige py-6">
              <p className="text-meta uppercase tracking-[0.16em]">The RE:WEAR standard</p>
              <h2 id="rewear-standard-title" className="title mt-2">A little more care in every listing.</h2>
              <ul className="mt-4 divide-y divide-beige">
                <li className="py-3 first:pt-0">
                  <h3 className="text-sm font-medium">One of a kind</h3>
                  <p className="mt-1 text-sm leading-relaxed text-brown">Each listing is a single piece. Once it finds a new home, it may not come back.</p>
                </li>
                <li className="py-3">
                  <h3 className="text-sm font-medium">Condition, clearly graded</h3>
                  <p className="mt-1 text-sm leading-relaxed text-brown">Check the condition grade, description and photos for the details of this piece’s previous life.</p>
                </li>
                <li className="py-3 last:pb-0">
                  <h3 className="text-sm font-medium">Reviewed before it reaches the rack</h3>
                  <p className="mt-1 text-sm leading-relaxed text-brown">Pieces are reviewed before they appear in the public collection.</p>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="container-page pb-16 md:pb-24">
          <SectionHeader
            id="related-title"
            title="You may also like"
            action={{ label: 'See all pieces', to: ROUTES.explore }}
          />
          <ProductGrid
            className="mt-10"
            products={related}
            columns="quad"
            wishlistIds={wishlist.ids}
            onToggleWishlist={isAdmin ? undefined : handleToggleWishlist}
          />
        </section>
      )}
    </>
  );
}
