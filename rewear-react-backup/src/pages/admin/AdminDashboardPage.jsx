import { Link } from 'react-router-dom';
import DashboardCard from '@/components/dashboard/DashboardCard';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import { PRODUCT_STATUS } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/lib/format';
import { authService, categoryService, orderService, productService } from '@/services';

export default function AdminDashboardPage() {
  const { data, loading } = useAsync(async () => Promise.all([
    productService.listAllProducts(), orderService.listOrders(), authService.listUsers(), categoryService.listCategories(),
  ]), []);
  const products = data?.[0] ?? [];
  const orders = data?.[1] ?? [];
  const users = data?.[2] ?? [];
  const categories = data?.[3] ?? [];
  const queue = products.filter((p) => p.status === PRODUCT_STATUS.PENDING);
  const live = products.filter((p) => p.status === PRODUCT_STATUS.APPROVED);

  return (
    <section className="container-page py-8 md:py-12" aria-labelledby="admin-dashboard-title">
      <p className="text-meta uppercase tracking-[0.16em]">Curator desk</p>
      <h1 id="admin-dashboard-title" className="display-md mt-2">The rack, at a glance.</h1>
      <p className="mt-3 max-w-2xl text-brown">A working overview of the pieces, people and orders in the RE:WEAR edit.</p>
      <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Awaiting review" value={queue.length} hint="Pieces in the curation queue" tone="attention" to={ROUTES.admin.curation} loading={loading} />
        <DashboardCard label="Live pieces" value={live.length} hint="Approved and visible" to={ROUTES.admin.products} loading={loading} />
        <DashboardCard label="Orders" value={orders.length} hint="Demo orders recorded locally" to={ROUTES.admin.orders} loading={loading} />
        <DashboardCard label="Members" value={users.length} hint={`${categories.length} product categories`} to={ROUTES.admin.users} loading={loading} />
      </div>

      <div className="mt-12 grid gap-12 xl:grid-cols-[1.2fr_0.8fr]">
        <section aria-labelledby="queue-preview-title">
          <div className="flex items-end justify-between gap-4 border-t border-dark-brown pt-5"><div><h2 id="queue-preview-title" className="title">Needs your eye</h2><p className="mt-2 text-sm text-brown">New pieces wait here before they join the public collection.</p></div><Link to={ROUTES.admin.curation} className="link-underline text-sm">Open queue</Link></div>
          {queue.length ? <ul className="mt-4 divide-y divide-beige border-y border-beige">{queue.slice(0, 4).map((piece) => <li key={piece.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">{piece.title}</p><p className="mt-1 text-meta">{piece.brand || 'Independent seller'} · {piece.size || 'Size not listed'}</p></div><div className="flex items-center gap-3"><StatusBadge status={piece.status} /><Link to={ROUTES.admin.curation} className="link-underline text-sm">Review</Link></div></li>)}</ul> : !loading && <EmptyState compact title="The queue is clear" description="New submissions will show up here." />}
        </section>
        <section aria-labelledby="recent-orders-title">
          <div className="flex items-end justify-between gap-4 border-t border-dark-brown pt-5"><div><h2 id="recent-orders-title" className="title">Recent orders</h2><p className="mt-2 text-sm text-brown">Latest activity in the demo shop.</p></div><Link to={ROUTES.admin.orders} className="link-underline text-sm">All orders</Link></div>
          {orders.length ? <ul className="mt-4 divide-y divide-beige border-y border-beige">{orders.slice(0, 4).map((order) => <li key={order.id} className="flex items-center justify-between gap-3 py-4"><div><p className="font-medium">{order.id}</p><p className="mt-1 text-meta">{order.buyerName} · {formatDate(order.createdAt)}</p></div><StatusBadge type="order" status={order.status} /></li>)}</ul> : !loading && <EmptyState compact title="No orders yet" description="Demo orders appear here after checkout is completed." action={<Button to={ROUTES.admin.orders} variant="secondary">View order desk</Button>} />}
        </section>
      </div>
      <p className="mt-10 text-xs leading-relaxed text-brown">Admin changes in this prototype are saved in this browser only. No live buyers or sellers are notified.</p>
    </section>
  );
}
