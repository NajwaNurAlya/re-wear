import { Link } from 'react-router-dom';
import { cx } from '@/lib/cx';

/**
 * <DashboardCard label="Awaiting review" value={12} hint="3 added today" to={ROUTES.admin.curation} tone="attention" />
 * With `to`, the label becomes a link and the whole card is clickable.
 * `value` is already formatted by the caller (numbers, formatRupiah(…)).
 */
export default function DashboardCard({ label, value, hint, icon, to, tone = 'default', loading = false, className }) {
  return (
    <div
      className={cx(
        'relative flex flex-col gap-2 border border-beige p-5 transition-colors',
        tone === 'attention' && 'border-l-4 border-l-ochre',
        to && 'hover:border-brown/60 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-dark-brown',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 text-brown">
        <p className="text-sm">
          {to ? (
            <Link to={to} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">{label}</Link>
          ) : (
            label
          )}
        </p>
        {icon && <span className="shrink-0">{icon}</span>}
      </div>

      {loading ? (
        <div aria-hidden="true" className="h-9 w-24 animate-pulse bg-beige" />
      ) : (
        <p className="font-serif text-4xl leading-none font-medium">{value}</p>
      )}
      {loading && <p className="sr-only" role="status">Loading {label}</p>}

      {hint && !loading && <p className="text-meta">{hint}</p>}
    </div>
  );
}
