import { Link, useParams } from 'react-router-dom';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import OrderTimeline from '@/components/dashboard/OrderTimeline';
import StatusBadge from '@/components/ui/StatusBadge';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatRupiah } from '@/lib/format';
import { orderService } from '@/services';

export default function OrderDetailPage() {
  const { id } = useParams();
  const { data: order, loading, error } = useAsync(() => orderService.getOrder(id), [id]);

  if (loading) return <section className="container-page py-16 text-center text-brown">Loading order…</section>;
  if (error || !order) return (
    <section className="container-page py-10 md:py-14">
      <EmptyState as="h1" title="Order not found" description="This order may belong to a different browser session." action={<Button to={ROUTES.orders}>Back to order history</Button>} />
    </section>
  );

  return (
    <section className="container-page py-10 md:py-14" aria-labelledby="order-title">
      <Link to={ROUTES.orders} className="link-underline text-sm">← Order history</Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-beige pb-6">
        <div>
          <p className="text-meta uppercase tracking-[0.16em]">Placed {formatDate(order.createdAt)}</p>
          <h1 id="order-title" className="display-md mt-2">Order {order.id}</h1>
        </div>
        <StatusBadge type="order" status={order.status} />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
        <div className="space-y-10">
          <section aria-labelledby="items-title">
            <h2 id="items-title" className="title">Pieces in this order</h2>
            <ul className="mt-4 divide-y divide-beige border-y border-beige">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-5 py-4">
                  <div>
                    <Link to={ROUTES.product(item.id)} className="font-medium link-underline">{item.title}</Link>
                    <p className="mt-1 text-meta">{item.brand} · Size {item.size} · One of a kind</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium">{formatRupiah(item.price)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex justify-between border-b border-beige pb-4 font-medium"><span>Subtotal</span><span>{formatRupiah(order.total)}</span></p>
          </section>

          <section aria-labelledby="delivery-title">
            <h2 id="delivery-title" className="title">Delivery address</h2>
            <address className="mt-3 not-italic leading-relaxed text-brown">
              {order.address.recipient}<br />{order.address.phone}<br />{order.address.line}<br />{order.address.city}, {order.address.postalCode}
            </address>
          </section>
        </div>

        <aside className="h-fit border border-beige p-5 md:p-6" aria-labelledby="progress-title">
          <h2 id="progress-title" className="title">Order progress</h2>
          <OrderTimeline status={order.status} events={order.events} className="mt-5" />
          <p className="mt-5 border-t border-beige pt-4 text-xs leading-relaxed text-brown">This demo order is stored locally. It does not initiate payment, packing, or delivery.</p>
        </aside>
      </div>
    </section>
  );
}
