import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminProductStatusAction from '@/components/product/AdminProductStatusAction';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { PRODUCT_STATUS } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { formatRupiah } from '@/lib/format';
import { authService, productService } from '@/services';

const FILTERS = [
  ['All', null], ['Live', PRODUCT_STATUS.APPROVED], ['In review', PRODUCT_STATUS.PENDING],
  ['Drafts', PRODUCT_STATUS.DRAFT], ['Changes requested', PRODUCT_STATUS.REJECTED], ['Sold', PRODUCT_STATUS.SOLD],
];

export default function AdminProductsPage() {
  const [filter, setFilter] = useState(null);
  const { data = [], loading, error, reload } = useAsync(() => productService.listAllProducts(), []);
  const soldIds = useMemo(() => (data ?? []).filter((product) => product.status === PRODUCT_STATUS.SOLD).map((product) => product.id), [data]);
  const soldIdKey = soldIds.join('|');
  const activeOrderLocks = useAsync(
    () => soldIds.length ? productService.listProductActiveOrderLocks(soldIds) : new Map(),
    [soldIdKey]
  );
  const members = useAsync(() => authService.listUsers(), []);
  const sellerNames = useMemo(() => new Map((members.data ?? []).map((m) => [m.id, m.fullName])), [members.data]);
  const rows = useMemo(() => filter ? (data ?? []).filter((p) => p.status === filter) : (data ?? []), [data, filter]);
  const columns = [
    { key: 'title', header: 'Piece', sortable: true, render: (p) => <><span className="font-medium">{p.title}</span><span className="block text-meta">{p.brand || 'No brand'} · {p.size || 'No size'}</span></> },
    { key: 'sellerId', header: 'Seller', render: (p) => sellerNames.get(p.sellerId) ?? 'Unknown seller' },
    { key: 'price', header: 'Price', align: 'right', sortable: true, render: (p) => formatRupiah(p.price) },
    { key: 'status', header: 'Status', sortable: true, render: (p) => <StatusBadge status={p.status} /> },
    { key: 'action', header: 'Action', render: (p) => (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {(p.status === PRODUCT_STATUS.APPROVED || p.status === PRODUCT_STATUS.SOLD) && <Link to={ROUTES.product(p.id)} className="link-underline text-sm">View</Link>}
        <AdminProductStatusAction
          product={p}
          activeOrderLock={activeOrderLocks.data?.get(p.id)}
          lockLoading={p.status === PRODUCT_STATUS.SOLD && activeOrderLocks.loading}
          onChanged={reload}
        />
      </div>
    ) },
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
      <p className="mt-5 text-xs text-brown">Photos and listing details are written by sellers; only approved pieces are public.</p>
    </section>
  );
}

