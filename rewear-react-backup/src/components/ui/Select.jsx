import { useId } from 'react';
import FormField, { controlClasses, describedBy } from '@/components/ui/FormField';
import { ChevronIcon } from '@/components/ui/icons';
import { cx } from '@/lib/cx';

const normalize = (options = []) =>
  options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

/**
 * <Select label="Size" options={SIZES} placeholder="Choose a size" />
 * `options` accepts strings or { value, label }.
 */
export default function Select({
  label, hint, error, required, optional, options, placeholder,
  id: idProp, className, wrapperClassName, children, ...rest
}) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <FormField id={id} label={label} hint={hint} error={error} required={required} optional={optional} className={wrapperClassName}>
      <div className="relative">
        <select
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, { hint, error })}
          className={cx(controlClasses(error), 'appearance-none pr-10', className)}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options ? normalize(options).map((o) => <option key={o.value} value={o.value}>{o.label}</option>) : children}
        </select>
        <ChevronIcon size={18} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-brown" />
      </div>
    </FormField>
  );
}
