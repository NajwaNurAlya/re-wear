import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { PRODUCT_STATUS } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/lib/format';
import { productService } from '@/services';

const FILTERS = ['All', 'Draft', 'Pending review', 'Approved', 'Rejected', 'Sold'];
const statusFor = (label) => ({ Draft: PRODUCT_STATUS.DRAFT, 'Pending review': PRODUCT_STATUS.PENDING, Approved: PRODUCT_STATUS.APPROVED, Rejected: PRODUCT_STATUS.REJECTED, Sold: PRODUCT_STATUS.SOLD }[label]);

export default function SellerProductsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('All');
  const { data = [], loading, error, reload } = useAsync(() => productService.listSellerProducts(user.id), [user.id]);
  const rows = useMemo(() => filter === 'All' ? data : data.filter((p) => p.status === statusFor(filter)), [data, filter]);
  const columns = [
    { key: 'title', header: 'Piece', sortable: true, render: (p) => <><span className="font-medium">{p.title}</span><span className="block text-meta">{p.brand || 'No brand listed'}</span></> },
    { key: 'price', header: 'Price', sortable: true, align: 'right', render: (p) => formatRupiah(p.price) },
    { key: 'status', header: 'Status', sortable: true, render: (p) => <StatusBadge status={p.status} /> },
    { key: 'action', header: '', render: (p) => <Button to={ROUTES.seller.editProduct(p.id)} variant="ghost" size="sm">Edit</Button> },
  ];

  return (
    <section className="container-page py-8 md:py-12" aria-labelledby="seller-products-title">
      <p className="text-meta uppercase tracking-[0.16em]">Seller studio</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 id="seller-products-title" className="display-md">Your listings</h1><p className="mt-3 max-w-2xl text-brown">Draft a piece, send it for review, and follow it through to the rack.</p></div><Button to={ROUTES.seller.newProduct}>List a piece</Button></div>
      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter listings">
        {FILTERS.map((item) => <Button key={item} variant={filter === item ? 'primary' : 'secondary'} size="sm" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</Button>)}
      </div>
      <div className="mt-5">
        {error ? <EmptyState title="Listings could not be loaded" description="Please try again." action={<Button variant="secondary" onClick={reload}>Retry</Button>} /> : (
          <DataTable caption="Seller listings" columns={columns} rows={rows} loading={loading} empty={<EmptyState compact title={filter === 'All' ? 'No listings yet' : `No ${filter.toLowerCase()} listings`} description="Your saved listings will appear here." action={filter === 'All' ? <Button to={ROUTES.seller.newProduct}>List a piece</Button> : undefined} />} />
        )}
      </div>
      <p className="mt-5 text-xs text-brown">Drafts are private to you. Submitted pieces appear in Explore once a curator approves them.</p>
    </section>
  );
}
