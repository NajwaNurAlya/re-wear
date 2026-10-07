import { useCallback, useState } from 'react';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import Textarea from '@/components/ui/Textarea';
import { PRODUCT_STATUS } from '@/constants';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/hooks/useToast';
import { formatRupiah } from '@/lib/format';
import { productService } from '@/services';

export default function AdminCurationPage() {
  const [revision, setRevision] = useState(0);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const toast = useToast();
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const { data = [], loading, error, reload } = useAsync(async () => (await productService.listAllProducts()).filter((p) => p.status === PRODUCT_STATUS.PENDING), [revision]);

  const approve = async (product) => {
    await productService.setProductModeration(product.id, PRODUCT_STATUS.APPROVED);
    toast.success(`${product.title} is now in the public collection.`, { title: 'Piece approved' });
    refresh();
  };
  const reject = async () => {
    if (!reason.trim()) return;
    await productService.setProductModeration(rejecting.id, PRODUCT_STATUS.REJECTED, reason.trim());
    toast.info(`${rejecting.title} was returned to the seller with notes.`, { title: 'Changes requested' });
    setRejecting(null);
    setReason('');
    refresh();
  };

  const columns = [
    { key: 'title', header: 'Submission', sortable: true, render: (piece) => <><span className="font-medium">{piece.title}</span><span className="block text-meta">{piece.brand || 'No brand'} · {piece.size || 'No size'}</span></> },
    { key: 'categoryId', header: 'Category', render: (piece) => piece.categoryId?.replace('cat-', '') ?? '—' },
    { key: 'price', header: 'Price', align: 'right', sortable: true, render: (piece) => formatRupiah(piece.price) },
    { key: 'status', header: 'Status', render: (piece) => <StatusBadge status={piece.status} /> },
    { key: 'actions', header: 'Review', render: (piece) => <div className="flex gap-2"><Button size="sm" onClick={() => approve(piece)}>Approve</Button><Button size="sm" variant="danger-outline" onClick={() => { setRejecting(piece); setReason(''); }}>Request changes</Button></div> },
  ];

  return (
    <section className="container-page py-8 md:py-12" aria-labelledby="curation-title">
      <p className="text-meta uppercase tracking-[0.16em]">Curator desk</p>
      <h1 id="curation-title" className="display-md mt-2">Curation queue</h1>
      <p className="mt-3 max-w-2xl text-brown">Review photos, description and condition before a piece joins the public rack.</p>
      <div className="mt-8 flex items-center justify-between gap-4 border-t border-beige pt-5"><p className="text-sm">{loading ? 'Checking submissions…' : `${data.length} ${data.length === 1 ? 'piece' : 'pieces'} waiting`}</p><p className="text-meta">Approval makes a listing visible in Explore.</p></div>
      <div className="mt-4">{error ? <EmptyState title="Queue could not be loaded" description="Please retry." action={<Button variant="secondary" onClick={reload}>Retry</Button>} /> : <DataTable caption="Products waiting for curation" columns={columns} rows={data} loading={loading} empty={<EmptyState compact title="Nothing waiting for review" description="New seller submissions will appear here." />} />}</div>
      <p className="mt-5 text-xs leading-relaxed text-brown">This prototype records moderation decisions in local browser storage only.</p>

      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} title="Request changes" description={rejecting ? `Tell the seller what to revise on “${rejecting.title}”.` : ''} footer={<><Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="danger" disabled={!reason.trim()} onClick={reject}>Send notes</Button></>}>
        <Textarea label="Notes for the seller" required rows={4} value={reason} onChange={(event) => setReason(event.target.value)} hint="For example: add a close-up of the hem or describe the mark near the cuff." />
      </Modal>
    </section>
  );
}
