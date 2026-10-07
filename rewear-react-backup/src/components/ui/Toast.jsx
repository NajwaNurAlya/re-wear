import { useEffect, useRef, useState } from 'react';
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from '@/components/ui/icons';
import { cx } from '@/lib/cx';

const TONES = {
  success: { rule: 'border-l-moss', icon: CheckIcon, iconClass: 'text-moss' },
  error: { rule: 'border-l-brick', icon: AlertIcon, iconClass: 'text-brick' },
  info: { rule: 'border-l-dusk', icon: InfoIcon, iconClass: 'text-dusk' },
};

// One notification. Auto-dismisses after `duration` ms, and the timer pauses
// while the pointer or keyboard focus is on it so people can finish reading.
export function Toast({ toast, onDismiss }) {
  const { id, tone = 'info', title, message, duration } = toast;
  const { rule, icon: Icon, iconClass } = TONES[tone] ?? TONES.info;
  const [paused, setPaused] = useState(false);
  const remaining = useRef(duration);

  useEffect(() => {
    if (!duration || paused) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => onDismiss(id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt;
    };
  }, [paused, duration, id, onDismiss]);

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cx(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 border border-l-4 border-brown/30 bg-cream p-4 text-sm',
        rule
      )}
    >
      <Icon size={20} className={cx('mt-0.5 shrink-0', iconClass)} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        <p className={title ? 'text-brown' : undefined}>{message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center text-brown hover:text-dark-brown"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}

// The fixed region that holds all toasts. Rendered once by <ToastProvider />.
export function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export default Toast;
