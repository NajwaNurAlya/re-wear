import { useRef } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

/**
 * <ConfirmDialog
 *   open={open}
 *   tone="danger"
 *   title="Delete this draft?"
 *   description="This can't be undone."
 *   confirmLabel="Delete draft"
 *   loading={deleting}
 *   onConfirm={handleDelete}
 *   onCancel={() => setOpen(false)}
 * />
 * Focus starts on Cancel so a stray Enter never confirms a destructive action.
 * Name the action on the confirm button ("Delete draft"), not "OK".
 */
export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  loading = false,
  children,
}) {
  const cancelRef = useRef(null);

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      description={description}
      size="sm"
      role="alertdialog"
      hideClose
      closeOnBackdrop={!loading}
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
