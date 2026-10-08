import { Link } from 'react-router-dom';
import DashboardCard from '@/components/dashboard/DashboardCard';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import { PRODUCT_STATUS } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/lib/format';
import { orderService, productService } from '@/services';

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const { data, loading } = useAsync(async () => Promise.all([
    productService.listSellerProducts(user.id), orderService.listSellerOrders(user.id),
  ]), [user.id]);
  const products = data?.[0] ?? [];
  const orders = data?.[1] ?? [];
  const pending = products.filter((p) => p.status === PRODUCT_STATUS.PENDING).length;
  const active = products.filter((p) => p.status === PRODUCT_STATUS.APPROVED).length;

  return (
    <section className="container-page py-8 md:py-12" aria-labelledby="seller-dashboard-title">
      <p className="text-meta uppercase tracking-[0.16em]">Seller studio</p>
      <h1 id="seller-dashboard-title" className="display-md mt-2">Welcome back, {user.fullName.split(' ')[0]}.</h1>
      <p className="mt-3 max-w-2xl text-brown">A clear view of your listings, review queue and orders.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button to={ROUTES.seller.newProduct}>List a piece</Button>
        <Button to={ROUTES.seller.products} variant="secondary">View all listings</Button>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="All listings" value={products.length} hint="Across every status" to={ROUTES.seller.products} loading={loading} />
        <DashboardCard label="Live on the rack" value={active} hint="Approved listings" to={ROUTES.seller.products} loading={loading} />
        <DashboardCard label="Awaiting review" value={pending} hint="With the curator" tone="attention" to={ROUTES.seller.products} loading={loading} />
        <DashboardCard label="Orders" value={orders.length} hint="Containing your pieces" to={ROUTES.seller.orders} loading={loading} />
      </div>

      <section className="mt-12" aria-labelledby="recent-listings-title">
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-dark-brown pt-5">
          <div><h2 id="recent-listings-title" className="title">Recent listings</h2><p className="mt-2 text-sm text-brown">Keep an eye on what is live and what needs attention.</p></div>
          <Link to={ROUTES.seller.products} className="link-underline text-sm">Manage listings</Link>
        </div>
        {!loading && products.length === 0 ? (
          <EmptyState compact title="Your rail is waiting for its first piece." description="Add a listing to begin the curator review process." action={<Button to={ROUTES.seller.newProduct}>List your first piece</Button>} />
        ) : (
          <ul className="mt-4 divide-y divide-beige border-y border-beige">
            {products.slice(0, 5).map((product) => (
              <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div><p className="font-medium">{product.title}</p><p className="mt-1 text-meta">{formatRupiah(product.price)}</p></div>
                <div className="flex items-center gap-3"><StatusBadge status={product.status} /><Link to={ROUTES.seller.editProduct(product.id)} className="link-underline text-sm">Edit</Link></div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-5 text-xs leading-relaxed text-brown">Listings and order records are saved to your seller account.</p>
      </section>
    </section>
  );
}
