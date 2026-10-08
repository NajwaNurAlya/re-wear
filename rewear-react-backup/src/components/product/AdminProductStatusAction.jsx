import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { PRODUCT_STATUS } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { productService } from '@/services';

function actionFor(product) {
  if (product?.status === PRODUCT_STATUS.APPROVED) {
    return {
      nextStatus: PRODUCT_STATUS.SOLD,
      label: 'Mark sold',
      title: 'Mark this piece as sold?',
      description: 'This only changes the product status. It will not create an order, remove images, or change order history.',
      confirmLabel: 'Mark as sold',
      successTitle: 'Piece marked sold',
      successMessage: `${product.title} is no longer available for checkout.`,
    };
  }
  if (product?.status === PRODUCT_STATUS.SOLD) {
    return {
      nextStatus: PRODUCT_STATUS.APPROVED,
      label: 'Restore',
      title: 'Restore this sold piece?',
      description: 'This is only allowed when no active or completed order still owns the sale. If it is tied to an order, use the order desk and cancellation workflow.',
      confirmLabel: 'Restore to approved',
      successTitle: 'Piece restored',
      successMessage: `${product.title} is available again.`,
    };
  }
  return null;
}

export default function AdminProductStatusAction({ product, activeOrderLock, lockLoading = false, onChanged, size = 'sm', fullWidth = false }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const action = actionFor(product);

  if (!action) return null;
  if (product.status === PRODUCT_STATUS.SOLD && lockLoading) {
    return <p className="text-xs text-brown">Checking order lock...</p>;
  }
  if (product.status === PRODUCT_STATUS.SOLD && activeOrderLock) {
    return (
      <div className="max-w-56 text-xs leading-relaxed text-brown">
        <p className="font-medium text-dark-brown">Locked by active order</p>
        <p>Complete or cancel the order before restoring this product.</p>
        <Link to={ROUTES.admin.orders} className="link-underline">Open order desk</Link>
      </div>
    );
  }

  const confirm = async () => {
    setSaving(true);
    try {
      const updated = await productService.setProductAvailability(product.id, action.nextStatus);
      toast.success(action.successMessage, { title: action.successTitle });
      setConfirming(false);
      await onChanged?.(updated);
    } catch (error) {
      toast.error(error.message || 'The product status could not be changed.', { title: 'Status not updated' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="secondary" size={size} fullWidth={fullWidth} onClick={() => setConfirming(true)}>
        {action.label}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={action.title}
        description={action.description}
        confirmLabel={action.confirmLabel}
        loading={saving}
        onConfirm={confirm}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
