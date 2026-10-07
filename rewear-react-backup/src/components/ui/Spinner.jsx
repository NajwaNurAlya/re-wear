import { cx } from '@/lib/cx';

/**
 * <Spinner />                      announces "Loading" to screen readers
 * <Spinner decorative />           silent, for use inside a button that already says what is happening
 * <Spinner showLabel label="..." /> visible caption next to the ring
 */
export default function Spinner({ size = 20, label = 'Loading', showLabel = false, decorative = false, className }) {
  const ring = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );

  if (decorative) return <span className={cx('inline-flex', className)} aria-hidden="true">{ring}</span>;

  return (
    <span role="status" className={cx('inline-flex items-center gap-2', className)}>
      {ring}
      <span className={showLabel ? 'text-sm' : 'sr-only'}>{label}</span>
    </span>
  );
}
