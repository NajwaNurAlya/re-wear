import { cx } from '@/lib/cx';

// Shared label / hint / error wrapper used by Input, Select and Textarea.
// `describedBy(id, { hint, error })` gives the control its aria-describedby value.
export const describedBy = (id, { hint, error }) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export default function FormField({ id, label, hint, error, required, optional, className, children }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span aria-hidden="true" className="text-brick"> *</span>}
          {optional && <span className="font-normal text-brown"> (optional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-brick">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-meta">{hint}</p>
      ) : null}
    </div>
  );
}

export const controlClasses = (error) =>
  cx(
    'h-11 w-full min-w-0 border bg-cream px-3 text-base text-dark-brown transition-colors',
    'placeholder:text-brown/90 focus-visible:border-dark-brown',
    'disabled:cursor-not-allowed disabled:bg-beige/40 disabled:text-brown',
    error ? 'border-brick' : 'border-brown/75'
  );
