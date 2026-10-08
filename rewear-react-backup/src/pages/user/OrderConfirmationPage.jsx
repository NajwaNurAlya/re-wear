import { Link, useParams } from 'react-router-dom';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatRupiah } from '@/lib/format';
import { orderService } from '@/services';

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const { data: order, loading, error } = useAsync(() => orderService.getOrder(id), [id]);

  if (loading) return <section className="container-page py-16 text-center text-brown">Loading order…</section>;
  if (error || !order) return (
    <section className="container-page py-10 md:py-14">
      <EmptyState as="h1" title="We couldn’t find that order" description="It may belong to a different account, or it is no longer available here." action={<Button to={ROUTES.orders}>Go to order history</Button>} />
    </section>
  );

  return (
    <section className="container-page py-12 md:py-20" aria-labelledby="confirmation-title">
      <div className="mx-auto max-w-2xl border-y border-beige py-10 text-center md:py-14">
        <p className="text-meta uppercase tracking-[0.16em]">Order placed</p>
        <h1 id="confirmation-title" className="display-md mt-3">Thank you, {order.address.recipient}.</h1>
        <p className="mx-auto mt-4 max-w-lg text-brown">Your order has been recorded. No payment has been collected yet; the RE:WEAR team will follow up on payment and delivery.</p>
        <div className="mx-auto mt-7 flex max-w-sm items-center justify-between border-y border-beige py-4 text-sm">
          <span>Order {order.orderNumber ?? order.id}</span><StatusBadge type="order" status={order.status} />
        </div>
        <p className="mt-4 text-sm text-brown">Placed {formatDate(order.createdAt)} · {formatRupiah(order.total)}</p>
        <p className="mt-3 text-sm text-brown">Delivery to {order.address.city}, {order.address.postalCode}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button to={ROUTES.order(order.id)}>View order details</Button>
          <Button to={ROUTES.explore} variant="secondary">Back to the collection</Button>
        </div>
        <Link to={ROUTES.orders} className="link-underline mt-6 inline-block text-sm">See order history</Link>
      </div>
    </section>
  );
}
