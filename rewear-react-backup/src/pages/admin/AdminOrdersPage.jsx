import { useCallback, useState } from 'react';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { ORDER_STATUS } from '@/constants';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatRupiah } from '@/lib/format';
import { orderService } from '@/services';

const NEXT = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PROCESSING, 'Record payment & prepare'],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, 'Mark shipped'],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.COMPLETED, 'Mark delivered'],
};

export default function AdminOrdersPage() {
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const { data = [], loading, error, reload } = useAsync(() => orderService.listOrders(), [revision]);
  const advance = async (id, status) => { await orderService.updateOrderStatus(id, status); refresh(); };
  const columns = [
    { key: 'id', header: 'Order', sortable: true, render: (order) => <><span className="font-medium">{order.id}</span><span className="block text-meta">{formatDate(order.createdAt)}</span></> },
    { key: 'buyerName', header: 'Buyer', sortable: true },
    { key: 'items', header: 'Pieces', render: (order) => order.items.map((item) => item.title).join(', ') },
    { key: 'total', header: 'Subtotal', sortable: true, align: 'right', render: (order) => formatRupiah(order.total) },
    { key: 'status', header: 'Status', render: (order) => <StatusBadge type="order" status={order.status} /> },
    { key: 'action', header: 'Next step', render: (order) => NEXT[order.status] ? <Button size="sm" variant="secondary" onClick={() => advance(order.id, NEXT[order.status][0])}>{NEXT[order.status][1]}</Button> : null },
  ];

  return (
    <section className="container-page py-8 md:py-12" aria-labelledby="admin-orders-title">
      <p className="text-meta uppercase tracking-[0.16em]">Curator desk</p>
      <h1 id="admin-orders-title" className="display-md mt-2">Order desk</h1>
      <p className="mt-3 max-w-2xl text-brown">Keep track of demo orders and move them through the sample fulfillment timeline.</p>
      <div className="mt-8 border-t border-beige pt-6">{error ? <EmptyState title="Orders could not be loaded" description="Please try again." action={<Button variant="secondary" onClick={reload}>Retry</Button>} /> : <DataTable caption="All demo orders" columns={columns} rows={data} loading={loading} empty={<EmptyState compact title="No orders on the desk" description="A buyer’s demo checkout will create an order here." />} />}</div>
      <p className="mt-5 text-xs leading-relaxed text-brown">Status changes update the demo timeline in this browser. Payment, shipping labels and customer notifications are not connected.</p>
    </section>
  );
}
