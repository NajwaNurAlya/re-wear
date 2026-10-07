import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import { PAYMENT_METHODS } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';
import { formatRupiah } from '@/lib/format';
import { orderService } from '@/services';

const INITIAL = { recipient: '', phone: '', address: '', city: '', postalCode: '', paymentMethod: '' };

export default function CheckoutPage() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [values, setValues] = useState(() => ({ ...INITIAL, recipient: user?.fullName ?? '' }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!values.paymentMethod) { setError('Choose a payment method to continue.'); return; }
    setBusy(true);
    setError('');
    try {
      const order = await orderService.createOrder({
        buyer: user,
        items: cart.items,
        address: { recipient: values.recipient, phone: values.phone, line: values.address, city: values.city, postalCode: values.postalCode },
        paymentMethod: values.paymentMethod,
      });
      cart.clear();
      navigate(ROUTES.orderConfirmation(order.id), { replace: true });
    } catch (e) {
      setError(e.message || 'We could not place this demo order. Please try again.');
      setBusy(false);
    }
  };

  if (!cart.items.length) {
    return (
      <section className="container-page py-10 md:py-14">
        <p className="text-meta uppercase tracking-[0.16em]">Checkout</p>
        <h1 className="display-lg mt-2">Your bag is empty</h1>
        <EmptyState title="Nothing to check out yet." description="Find a piece you love and it will show up here." action={<Button to={ROUTES.explore}>Explore the collection</Button>} />
      </section>
    );
  }

  return (
    <section className="container-page py-10 md:py-14" aria-labelledby="checkout-title">
      <p className="text-meta uppercase tracking-[0.16em]">A final few details</p>
      <h1 id="checkout-title" className="display-lg mt-2">Checkout</h1>
      <p className="mt-3 max-w-2xl text-brown">These one-off pieces are almost ready for their next home.</p>

      <div className="mt-8 grid gap-10 border-t border-beige pt-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <form onSubmit={submit} className="grid content-start gap-8">
          <section aria-labelledby="delivery-title" className="grid gap-5 border-b border-beige pb-8">
            <div>
              <h2 id="delivery-title" className="title">Delivery details</h2>
              <p className="mt-1 text-sm text-brown">Enter where the order should be addressed.</p>
            </div>
            <Input label="Recipient name" required autoComplete="name" value={values.recipient} onChange={set('recipient')} />
            <Input label="Phone number" required type="tel" autoComplete="tel" value={values.phone} onChange={set('phone')} />
            <Input label="Street address" required autoComplete="street-address" value={values.address} onChange={set('address')} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="City / regency" required autoComplete="address-level2" value={values.city} onChange={set('city')} />
              <Input label="Postal code" required inputMode="numeric" autoComplete="postal-code" value={values.postalCode} onChange={set('postalCode')} />
            </div>
          </section>

          <section aria-labelledby="payment-title" className="grid gap-4">
            <div>
              <h2 id="payment-title" className="title">Payment method</h2>
              <p className="mt-1 text-sm text-brown">Choose a method for this demo order.</p>
            </div>
            {PAYMENT_METHODS.map((method) => (
              <label key={method.value} className="flex cursor-pointer items-center gap-3 border border-beige p-4 transition-colors has-[:checked]:border-dark-brown has-[:checked]:bg-beige/25">
                <input type="radio" name="paymentMethod" value={method.value} checked={values.paymentMethod === method.value} onChange={set('paymentMethod')} className="accent-dark-brown" />
                <span className="text-sm font-medium">{method.label}</span>
              </label>
            ))}
          </section>
          {error && <p role="alert" className="text-sm text-brick">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-beige pt-5">
            <Link to={ROUTES.cart} className="link-underline text-sm">Back to bag</Link>
            <Button type="submit" size="lg" loading={busy}>Place demo order</Button>
          </div>
        </form>

        <aside className="h-fit border border-beige bg-white/35 p-5 md:p-6" aria-labelledby="order-summary-title">
          <h2 id="order-summary-title" className="title">Your pieces</h2>
          <ul className="mt-4 divide-y divide-beige">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-3 first:pt-0 text-sm">
                <span className="min-w-0">{item.title}<span className="block text-meta">One of a kind · {item.size}</span></span>
                <span className="shrink-0 font-medium">{formatRupiah(item.price)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex justify-between border-t border-beige pt-4 text-sm font-medium"><span>Subtotal</span><span>{formatRupiah(cart.total)}</span></p>
          <p className="mt-4 border-l-2 border-ochre bg-beige/30 p-3 text-xs leading-relaxed text-brown">
            Demo checkout only. No payment is collected and this order is saved only in this browser. Shipping fees and return policy are not configured yet.
          </p>
        </aside>
      </div>
    </section>
  );
}
