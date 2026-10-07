import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { PRODUCT_STATUS } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { formatRupiah } from '@/lib/format';
import { productService } from '@/services';

const FILTERS = [
  ['All', null], ['Live', PRODUCT_STATUS.APPROVED], ['In review', PRODUCT_STATUS.PENDING],
  ['Drafts', PRODUCT_STATUS.DRAFT], ['Changes requested', PRODUCT_STATUS.REJECTED], ['Sold', PRODUCT_STATUS.SOLD],
];

export default function AdminProductsPage() {
  const [filter, setFilter] = useState(null);
  const { data = [], loading, error, reload } = useAsync(() => productService.listAllProducts(), []);
  const rows = useMemo(() => filter ? data.filter((p) => p.status === filter) : data, [data, filter]);
  const columns = [
    { key: 'title', header: 'Piece', sortable: true, render: (p) => <><span className="font-medium">{p.title}</span><span className="block text-meta">{p.brand || 'No brand'} · {p.size || 'No size'}</span></> },
    { key: 'sellerId', header: 'Seller', render: (p) => p.sellerId === 'seller-demo' ? 'Sari Seller' : p.sellerId },
    { key: 'price', header: 'Price', align: 'right', sortable: true, render: (p) => formatRupiah(p.price) },
    { key: 'status', header: 'Status', sortable: true, render: (p) => <StatusBadge status={p.status} /> },
    { key: 'view', header: '', render: (p) => p.status === PRODUCT_STATUS.APPROVED || p.status === PRODUCT_STATUS.SOLD ? <Link to={ROUTES.product(p.id)} className="link-underline text-sm">View</Link> : null },
  ];

  return (
    <section className="container-page py-8 md:py-12" aria-labelledby="admin-products-title">
      <p className="text-meta uppercase tracking-[0.16em]">Curator desk</p>
      <h1 id="admin-products-title" className="display-md mt-2">All pieces</h1>
      <p className="mt-3 max-w-2xl text-brown">A catalog-wide view of live listings, drafts and pieces awaiting review.</p>
      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter products by status">
        {FILTERS.map(([label, status]) => <Button key={label} size="sm" variant={filter === status ? 'primary' : 'secondary'} aria-pressed={filter === status} onClick={() => setFilter(status)}>{label}</Button>)}
      </div>
      <div className="mt-5">{error ? <EmptyState title="Catalog could not be loaded" description="Please try again." action={<Button variant="secondary" onClick={reload}>Retry</Button>} /> : <DataTable caption="All catalog pieces" columns={columns} rows={rows} loading={loading} empty={<EmptyState compact title="No pieces in this view" description="Try another status filter." />} />}</div>
      <p className="mt-5 text-xs text-brown">Product states are demo data held in browser storage. This view does not represent a live inventory system.</p>
    </section>
  );
}
