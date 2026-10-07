import { getStatusMeta } from '@/lib/status';
import { cx } from '@/lib/cx';

// Outline badge: border + text + dot, no fill, so contrast stays AA on cream and
// the status never relies on colour alone (the label always says it).
// Full class strings so Tailwind can see them.
const TONES = {
  draft: 'border-dashed border-brown/60 text-brown',
  ochre: 'border-ochre/50 text-ochre',
  moss: 'border-moss/50 text-moss',
  brick: 'border-brick/50 text-brick',
  dusk: 'border-dusk/50 text-dusk',
  ink: 'border-dark-brown bg-dark-brown text-cream',
};

/**
 * <StatusBadge status="pending" />                    product status (default)
 * <StatusBadge type="order" status="shipped" />       order status
 */
export default function StatusBadge({ status, type = 'product', label, className }) {
  const meta = getStatusMeta(type, status);
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap',
        TONES[meta.tone],
        className
      )}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {label ?? meta.label}
    </span>
  );
}
