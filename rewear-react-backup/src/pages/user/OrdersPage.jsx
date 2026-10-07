import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatRupiah } from '@/lib/format';
import { orderService } from '@/services';

export default function OrdersPage() {
  const { user } = useAuth();
  const { data = [], loading, error, reload } = useAsync(() => orderService.listBuyerOrders(user?.id), [user?.id]);

  return (
    <section className="container-page py-10 md:py-14" aria-labelledby="orders-title">
      <p className="text-meta uppercase tracking-[0.16em]">Your account</p>
      <h1 id="orders-title" className="display-lg mt-2">Order history</h1>
      <p className="mt-3 max-w-xl text-brown">A record of the pieces you have brought home.</p>

      <div className="mt-8 border-t border-beige pt-6">
        {loading ? <p className="py-12 text-center text-brown">Loading your orders…</p> : error ? (
          <EmptyState title="Orders could not be loaded" description="Please refresh and try again." action={<Button variant="secondary" onClick={reload}>Try again</Button>} />
        ) : data.length === 0 ? (
          <EmptyState title="Your next find is still out there." description="Orders you place will appear here with their status and details." action={<Button to={ROUTES.explore}>Explore the collection</Button>} />
        ) : (
          <ul className="divide-y divide-beige">
            {data.map((order) => (
              <li key={order.id} className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link to={ROUTES.order(order.id)} className="font-medium link-underline">{order.id}</Link>
                    <StatusBadge type="order" status={order.status} />
                  </div>
                  <p className="mt-2 text-sm text-brown">{formatDate(order.createdAt)} · {order.items.length} {order.items.length === 1 ? 'piece' : 'pieces'}</p>
                  <p className="mt-1 text-sm">{order.items.map((item) => item.title).join(', ')}</p>
                </div>
                <div className="flex items-center justify-between gap-5 sm:justify-end">
                  <p className="font-medium">{formatRupiah(order.total)}</p>
                  <Button to={ROUTES.order(order.id)} variant="secondary" size="sm">View order</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-6 text-xs leading-relaxed text-brown">Demo orders are stored in this browser only and are not sent to a seller.</p>
    </section>
  );
}
