import { useId } from 'react';
import FormField, { controlClasses, describedBy } from '@/components/ui/FormField';
import { cx } from '@/lib/cx';

/**
 * <Input label="Email" type="email" error="Enter a valid email" />
 * `prefix` / `suffix` render attached text such as "Rp".
 */
export default function Input({
  label, hint, error, required, optional, prefix, suffix,
  id: idProp, className, wrapperClassName, ...rest
}) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <FormField id={id} label={label} hint={hint} error={error} required={required} optional={optional} className={wrapperClassName}>
      <div className="flex">
        {prefix && (
          <span className={cx('flex items-center border border-r-0 bg-beige/50 px-3 text-sm text-brown', error ? 'border-brick' : 'border-brown/75')}>
            {prefix}
          </span>
        )}
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, { hint, error })}
          className={cx(controlClasses(error), className)}
          {...rest}
        />
        {suffix && (
          <span className={cx('flex items-center border border-l-0 bg-beige/50 px-3 text-sm text-brown', error ? 'border-brick' : 'border-brown/75')}>
            {suffix}
          </span>
        )}
      </div>
    </FormField>
  );
}
