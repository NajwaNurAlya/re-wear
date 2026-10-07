import { useId } from 'react';
import FormField, { controlClasses, describedBy } from '@/components/ui/FormField';
import { cx } from '@/lib/cx';

/**
 * <Textarea label="Description" rows={5} maxLength={600} showCount value={v} onChange={…} />
 * `showCount` needs a controlled `value`.
 */
export default function Textarea({
  label, hint, error, required, optional, showCount = false, rows = 4,
  id: idProp, className, wrapperClassName, value, ...rest
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const max = rest.maxLength;

  return (
    <FormField id={id} label={label} hint={hint} error={error} required={required} optional={optional} className={wrapperClassName}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { hint, error })}
        className={cx(controlClasses(error), 'h-auto min-h-24 resize-y py-2.5 leading-relaxed', className)}
        {...rest}
      />
      {showCount && max && value !== undefined && (
        <p className="text-right text-meta" aria-hidden="true">{String(value).length} / {max}</p>
      )}
    </FormField>
  );
}
