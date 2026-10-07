import { useMemo, useRef, useState } from 'react';
import {
  Button, ConfirmDialog, DataTable, EmptyState, Input, Modal, Pagination, RatingStars,
  SearchBar, Select, Spinner, StatusBadge, Textarea,
} from '@/components/ui';
import {
  FilterPanel, ProductBadge, ProductForm, ProductGallery, ProductGrid,
} from '@/components/product';
import { DashboardCard, OrderTimeline } from '@/components/dashboard';
import { ORDER_FLOW, ORDER_STATUS, PRODUCT_STATUS, SIZES } from '@/constants';
import { useToast } from '@/hooks/useToast';
import { EMPTY_FILTERS } from '@/lib/filters';
import { formatRupiah } from '@/lib/format';

// DEV ONLY (Step 4). A live catalogue of every reusable component. Delete before launch.

// Inline SVG "photos" so the gallery needs no network or assets.
const swatch = (bg, fg, label) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="${bg}"/><text x="200" y="270" text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="${fg}">${label}</text></svg>`
  )}`;

const PHOTOS = [
  swatch('#E8D8CF', '#6B5A52', 'front'),
  swatch('#D7A596', '#2D1F1A', 'back'),
  swatch('#6B5A52', '#FAF6F2', 'detail'),
];

const PRODUCTS = [
  { id: 'p1', title: 'Washed denim chore jacket', brand: 'Levi’s', price: 285000, size: 'M', era: '90s', condition: 'excellent', status: PRODUCT_STATUS.APPROVED, images: PHOTOS },
  { id: 'p2', title: 'Pleated wool midi skirt', brand: 'Unbranded', price: 165000, size: 'S', era: '80s', condition: 'good', status: PRODUCT_STATUS.PENDING, images: [PHOTOS[1]] },
  { id: 'p3', title: 'Ribbed knit cardigan', brand: 'Uniqlo', price: 120000, size: 'L', era: '2000s', condition: 'like_new', status: PRODUCT_STATUS.SOLD, images: [PHOTOS[2]] },
  { id: 'p4', title: 'Linen shirt with a very long name that wraps onto two lines', price: 99000, size: 'One Size', condition: 'fair', status: PRODUCT_STATUS.DRAFT, images: [] },
];

const CATEGORIES = [
  { id: 'c1', name: 'Outerwear' },
  { id: 'c2', name: 'Tops' },
  { id: 'c3', name: 'Bottoms' },
];

const ROWS = [
  { id: 'o1', ref: 'RW-1042', buyer: 'Nadia Putri', total: 285000, status: ORDER_STATUS.SHIPPED },
  { id: 'o2', ref: 'RW-1041', buyer: 'Rafi Hakim', total: 120000, status: ORDER_STATUS.PENDING },
  { id: 'o3', ref: 'RW-1040', buyer: 'Salsa Maharani', total: 450000, status: ORDER_STATUS.COMPLETED },
  { id: 'o4', ref: 'RW-1039', buyer: 'Dimas Anggara', total: 99000, status: ORDER_STATUS.CANCELLED },
];

function Block({ title, children }) {
  return (
    <section className="border-t border-beige py-10">
      <h2 className="title mb-6">{title}</h2>
      {children}
    </section>
  );
}

export default function ComponentGalleryPage() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [wishlist, setWishlist] = useState(new Set(['p1']));
  const [page, setPage] = useState(3);
  const [rating, setRating] = useState(3);
  const [orderStatus, setOrderStatus] = useState(ORDER_STATUS.PROCESSING);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [text, setText] = useState('');
  const modalTrigger = useRef(null);

  const toggleWishlist = (p) =>
    setWishlist((s) => {
      const next = new Set(s);
      next.has(p.id) ? next.delete(p.id) : next.add(p.id);
      return next;
    });

  const columns = useMemo(
    () => [
      { key: 'ref', header: 'Order', sortable: true },
      { key: 'buyer', header: 'Buyer', sortable: true, hideBelow: 'sm' },
      { key: 'total', header: 'Total', align: 'right', sortable: true, render: (r) => formatRupiah(r.total) },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge type="order" status={r.status} /> },
    ],
    []
  );

  return (
    <div className="container-page py-12">
      <p className="text-meta">Development only</p>
      <h1 className="display-md mt-2">Component gallery</h1>
      <p className="mt-3 max-w-xl text-brown">Every reusable component from Step 4, live. Tab through it to check focus states.</p>

      <Block title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="danger-outline">Danger outline</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button to="/explore" variant="secondary">As a link</Button>
        </div>
      </Block>

      <Block title="Form controls">
        <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
          <Input label="Full name" placeholder="Your name" />
          <Input label="Email" type="email" required error="Enter a valid email address." defaultValue="nadia@" />
          <Input label="Price" prefix="Rp" type="number" hint="Whole rupiah." />
          <Select label="Size" placeholder="Choose a size" options={SIZES} />
          <Textarea className="sm:col-span-2" wrapperClassName="sm:col-span-2" label="Description" maxLength={200} showCount value={text} onChange={(e) => setText(e.target.value)} hint="Fabric, fit, flaws." />
        </div>
      </Block>

      <Block title="Badges, rating, spinner">
        <div className="flex flex-wrap items-center gap-3">
          {Object.values(PRODUCT_STATUS).map((s) => <StatusBadge key={s} status={s} />)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {Object.values(ORDER_STATUS).map((s) => <StatusBadge key={s} type="order" status={s} />)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ProductBadge>M</ProductBadge>
          <ProductBadge>90s</ProductBadge>
          <ProductBadge tone="soft">Like new</ProductBadge>
          <ProductBadge tone="strong">Sold</ProductBadge>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-8">
          <RatingStars value={4.5} count={12} />
          <RatingStars value={3} />
          <RatingStars value={rating} onChange={setRating} label="Your rating" />
          <Spinner showLabel label="Loading pieces" />
        </div>
      </Block>

      <Block title="Search and pagination">
        <SearchBar className="max-w-md" onSubmit={(q) => toast.info(q ? `Searching for “${q}”` : 'Search cleared')} />
        <Pagination className="mt-8" page={page} totalPages={12} onPageChange={setPage} />
      </Block>

      <Block title="Overlays and toasts">
        <div className="flex flex-wrap gap-3">
          <Button ref={modalTrigger} variant="secondary" onClick={() => setModalOpen(true)}>Open modal</Button>
          <Button variant="danger-outline" onClick={() => setConfirmOpen(true)}>Delete draft…</Button>
          <Button variant="soft" onClick={() => toast.success('Product submitted for curation')}>Success toast</Button>
          <Button variant="soft" onClick={() => toast.error('Could not save your changes. Check your connection and try again.', { title: 'Save failed' })}>Error toast</Button>
          <Button variant="soft" onClick={() => toast.info('Link copied to clipboard', { duration: 2000 })}>Info toast</Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Shipping address"
          description="Where should the seller send your order?"
          footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => { setModalOpen(false); toast.success('Address saved'); }}>Save address</Button></>}
        >
          <div className="grid gap-4">
            <Input label="Recipient" />
            <Textarea label="Address" rows={3} />
          </div>
        </Modal>
        <ConfirmDialog
          open={confirmOpen}
          tone="danger"
          title="Delete this draft?"
          description="“Washed denim chore jacket” will be removed. This can’t be undone."
          confirmLabel="Delete draft"
          loading={confirming}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirming(true);
            setTimeout(() => { setConfirming(false); setConfirmOpen(false); toast.success('Draft deleted'); }, 900);
          }}
        />
      </Block>

      <Block title="Product grid">
        <div className="mb-4"><Button size="sm" variant="secondary" onClick={() => setLoadingGrid((l) => !l)}>{loadingGrid ? 'Show products' : 'Show loading state'}</Button></div>
        <ProductGrid products={PRODUCTS} loading={loadingGrid} skeletonCount={4} wishlistIds={wishlist} onToggleWishlist={toggleWishlist} showStatus />
        <div className="mt-10"><ProductGrid products={[]} /></div>
      </Block>

      <Block title="Filter panel">
        <div className="max-w-xs"><FilterPanel filters={filters} onChange={setFilters} onReset={() => setFilters(EMPTY_FILTERS)} categories={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))} /></div>
      </Block>

      <Block title="Product gallery">
        <div className="max-w-xl"><ProductGallery key="g" images={PHOTOS} title="Washed denim chore jacket"><ProductBadge>90s</ProductBadge></ProductGallery></div>
      </Block>

      <Block title="Product form">
        <ProductForm
          categories={CATEGORIES}
          onCancel={() => toast.info('Cancelled')}
          onSubmit={(values, intent) => toast.success(intent === 'draft' ? 'Draft saved' : 'Submitted for curation', { title: values.title })}
        />
      </Block>

      <Block title="Dashboard cards">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard label="Awaiting review" value={12} hint="3 added today" to="/admin/curation" tone="attention" />
          <DashboardCard label="Live products" value={148} />
          <DashboardCard label="Revenue this month" value={formatRupiah(12480000)} hint="From 42 orders" />
          <DashboardCard label="Loading card" loading />
        </div>
      </Block>

      <Block title="Order timeline">
        <div className="mb-6 max-w-xs">
          <Select label="Status" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} options={[...ORDER_FLOW, ORDER_STATUS.CANCELLED]} />
        </div>
        <OrderTimeline status={orderStatus} events={{ pending: '2026-09-28T09:00:00Z', paid: '2026-09-28T09:20:00Z' }} />
      </Block>

      <Block title="Data table">
        <DataTable columns={columns} rows={ROWS} caption="Recent orders" />
        <div className="mt-8"><DataTable columns={columns} rows={[]} caption="Empty table" /></div>
        <div className="mt-8"><DataTable columns={columns} rows={[]} loading caption="Loading table" /></div>
      </Block>

      <Block title="Empty state">
        <EmptyState title="Your wishlist is empty" description="Tap the heart on any piece to save it here." action={<Button to="/explore">Browse pieces</Button>} />
      </Block>
    </div>
  );
}
