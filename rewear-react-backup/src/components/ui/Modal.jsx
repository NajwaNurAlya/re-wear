import { useEffect, useId, useRef } from 'react';
import { CloseIcon } from '@/components/ui/icons';
import { cx } from '@/lib/cx';

// Built on the native <dialog>: the browser provides the focus trap, makes the
// page behind inert, and restores focus to the trigger when the dialog closes.
// Visibility is fully controlled by the `open` prop.

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

// Several modals can stack (e.g. a ConfirmDialog over a form), so count scroll locks.
let scrollLocks = 0;
function lockScroll() {
  if (scrollLocks++ === 0) document.body.style.overflow = 'hidden';
}
function unlockScroll() {
  if (--scrollLocks === 0) document.body.style.overflow = '';
}

/**
 * <Modal open={open} onClose={() => setOpen(false)} title="Edit address" footer={<Button>Save</Button>}>…</Modal>
 *
 * - Esc, the close button and a click on the backdrop all call onClose.
 * - initialFocusRef: element to focus on open (defaults to the first focusable one).
 * - Children are only mounted while open, so forms inside reset every time.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  role = 'dialog',
  closeOnBackdrop = true,
  hideClose = false,
  initialFocusRef,
  className,
}) {
  const ref = useRef(null);
  const openRef = useRef(open);
  const pointerStartedOnBackdrop = useRef(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    openRef.current = open;
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      initialFocusRef?.current?.focus();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (!open) return;
    lockScroll();
    return unlockScroll;
  }, [open]);

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      // Esc: keep React in charge of visibility.
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
      // Some browsers close the dialog natively on a repeated Esc; keep state in sync.
      onClose={() => {
        if (openRef.current) onClose?.();
      }}
      onPointerDown={(e) => {
        pointerStartedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (closeOnBackdrop && pointerStartedOnBackdrop.current && e.target === e.currentTarget) onClose?.();
      }}
      className={cx(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] border border-brown/30 bg-cream p-0 text-dark-brown',
        'backdrop:bg-dark-brown/50 open:flex open:flex-col',
        SIZES[size],
        className
      )}
    >
      {open && (
        <>
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div className="min-w-0">
              {title && <h2 id={titleId} className="title">{title}</h2>}
              {description && <p id={descId} className="mt-1.5 text-sm text-brown">{description}</p>}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="-mt-2 -mr-2 grid size-10 shrink-0 place-items-center text-brown hover:text-dark-brown"
              >
                <CloseIcon size={20} />
              </button>
            )}
          </div>

          {children && <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>}

          {footer && (
            <div className="flex flex-wrap justify-end gap-3 border-t border-beige px-6 py-4">{footer}</div>
          )}
          {!children && !footer && <div className="pb-6" />}
        </>
      )}
    </dialog>
  );
}
