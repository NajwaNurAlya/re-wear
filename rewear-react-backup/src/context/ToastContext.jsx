import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import { ToastViewport } from '@/components/ui/Toast';

export const ToastContext = createContext(null);

const MAX_VISIBLE = 4;
const DURATIONS = { success: 4000, info: 5000, error: 8000 };

/**
 * Usage (anywhere under <ToastProvider />):
 *   const toast = useToast();
 *   toast.success('Product submitted for curation');
 *   toast.error('Could not save', { title: 'Something went wrong' });
 *   toast.info('Link copied', { duration: 2000 });   // duration 0 = stays until dismissed
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((tone, message, options = {}) => {
    const id = ++counter.current;
    const toast = { id, tone, message, title: options.title, duration: options.duration ?? DURATIONS[tone] };
    setToasts((list) => [...list, toast].slice(-MAX_VISIBLE));
    return id;
  }, []);

  // Stable value: components that only fire toasts never re-render when toasts change.
  const api = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, options) => show('success', message, options),
      error: (message, options) => show('error', message, options),
      info: (message, options) => show('info', message, options),
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
