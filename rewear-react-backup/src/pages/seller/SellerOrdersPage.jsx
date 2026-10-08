import { useCallback, useState } from 'react';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { ORDER_STATUS } from '@/constants';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatRupiah } from '@/lib/format';
import { orderService } from '@/services';

export default function SellerOrdersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);
  const { data = [], loading, error, reload } = useAsync(() => orderService.listSellerOrders(user.id), [user.id, reloadKey]);
  const markShipped = async (id) => {
    try { await orderService.updateOrderStatus(id, ORDER_STATUS.SHIPPED); }
    catch (e) { toast.error(e.message || 'The order could not be updated.', { title: 'Order not updated' }); }
    refresh();
  };
  const columns = [
    { key: 'id', header: 'Order', sortable: true, render: (order) => <><span className="font-medium">{order.orderNumber ?? order.id}</span><span className="block text-meta">{formatDate(order.createdAt)}</span></> },
    { key: 'buyerName', header: 'Buyer', sortable: true },
    { key: 'items', header: 'Your pieces', render: (order) => order.items.map((item) => item.title).join(', ') },
    { key: 'total', header: 'Value', align: 'right', sortable: true, render: (order) => formatRupiah(order.items.reduce((sum, item) => sum + item.price, 0)) },
    { key: 'status', header: 'Status', render: (order) => <StatusBadge type="order" status={order.status} /> },
    { key: 'action', header: '', render: (order) => order.status === ORDER_STATUS.PROCESSING ? <Button size="sm" variant="secondary" onClick={() => markShipped(order.id)}>Mark shipped</Button> : null },
  ];

  return (
    <section className="container-page py-8 md:py-12" aria-labelledby="seller-orders-title">
      <p className="text-meta uppercase tracking-[0.16em]">Seller studio</p>
      <h1 id="seller-orders-title" className="display-md mt-2">Orders for your pieces</h1>
      <p className="mt-3 max-w-2xl text-brown">Review what has sold and keep your buyers up to date on each order.</p>
      <div className="mt-8 border-t border-beige pt-6">
        {error ? <EmptyState title="Orders could not be loaded" description="Try again in a moment." action={<Button variant="secondary" onClick={reload}>Retry</Button>} /> : <DataTable caption="Orders containing your products" columns={columns} rows={data} loading={loading} empty={<EmptyState compact title="No orders for your rail yet" description="Orders that include one of your pieces will appear here." />} />}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-brown">Marking an order shipped updates its status for the buyer and the curators. It does not arrange delivery.</p>
    </section>
  );
}
