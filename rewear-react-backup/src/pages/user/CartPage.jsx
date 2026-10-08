import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import ImagePlaceholder from '@/components/ui/ImagePlaceholder';
import ProductBadge from '@/components/product/ProductBadge';
import { ROUTES } from '@/constants/routes';
import { useCart } from '@/hooks/useCart';
import { formatRupiah } from '@/lib/format';

function CartLine({ item, onRemove }) {
  const unavailable = Boolean(item.status) && item.status !== 'approved';
  return (
    <li className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 border-b border-beige py-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6">
      <Link to={ROUTES.product(item.id)} aria-label={`View ${item.title}`} className="product-photo relative block aspect-[4/5] overflow-hidden">
        {item.image ? <img src={item.image} alt="" className="size-full object-cover" /> : <ImagePlaceholder />}
      </Link>
      <div className="flex min-w-0 flex-col items-start">
        {item.brand && <p className="text-meta">{item.brand}</p>}
        <h2 className="mt-1 font-serif text-xl leading-snug">
          <Link to={ROUTES.product(item.id)} className="hover:underline">{item.title}</Link>
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.size && <ProductBadge>{item.size}</ProductBadge>}
          <ProductBadge tone="soft">One of a kind</ProductBadge>
          {unavailable && <ProductBadge>No longer available</ProductBadge>}
        </div>
        <p className={`mt-3 text-sm font-medium ${unavailable ? 'text-brown line-through' : ''}`}>{formatRupiah(item.price)}</p>
        {unavailable && <p className="mt-1 text-xs text-brown">Someone else found this piece first. Remove it to continue.</p>}
        <Button variant="ghost" size="sm" onClick={() => onRemove(item.id)} className="mt-3 -ml-3">
          Remove
        </Button>
      </div>
    </li>
  );
}

export default function CartPage() {
  const cart = useCart();

  return (
    <section className="container-page py-10 md:py-14" aria-labelledby="cart-title">
      <p className="text-meta uppercase tracking-[0.16em]">Your RE:WEAR edit</p>
      <h1 id="cart-title" className="display-lg mt-2">Your bag</h1>
      <p className="mt-3 max-w-xl text-brown">A few good finds, gathered in one place. Each piece is a one-off.</p>

      {cart.items.length === 0 ? (
        <div className="mt-6 border-t border-beige">
          <EmptyState
            title="Your bag is taking a breather."
            description="When a piece catches your eye, it will be waiting here."
            action={<Button to={ROUTES.explore}>Explore the collection</Button>}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-10 border-t border-beige pt-2 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
          <div>
            <div className="flex items-center justify-between border-b border-beige py-4 text-sm">
              <p>{cart.count} {cart.count === 1 ? 'piece' : 'pieces'}</p>
              <Link to={ROUTES.explore} className="link-underline">Continue browsing</Link>
            </div>
            <ul role="list">
              {cart.items.map((item) => <CartLine key={item.id} item={item} onRemove={cart.remove} />)}
            </ul>
          </div>

          <aside className="h-fit border border-beige bg-white/35 p-5 md:p-6" aria-labelledby="summary-title">
            <h2 id="summary-title" className="title">Order summary</h2>
            <div className="mt-5 flex justify-between border-t border-beige pt-4 text-sm">
              <span>Subtotal before shipping</span>
              <span className="font-medium">{formatRupiah(cart.total)}</span>
            </div>
            <p className="mt-3 text-meta">The total covers the listed pieces only.</p>
            {cart.available.length > 0
              ? <Button to={ROUTES.checkout} fullWidth size="lg" className="mt-6">Continue to checkout</Button>
              : <Button disabled fullWidth size="lg" className="mt-6">Nothing available to order</Button>}
            <p className="mt-4 text-center text-xs leading-relaxed text-brown">One of a kind means there is only one available. Review the item details before checkout.</p>
          </aside>
        </div>
      )}
    </section>
  );
}
