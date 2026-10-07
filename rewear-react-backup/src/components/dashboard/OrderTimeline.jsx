import { CheckIcon, CloseIcon } from '@/components/ui/icons';
import { ORDER_FLOW, ORDER_STATUS } from '@/constants';
import { formatDate } from '@/lib/format';
import { getStatusMeta } from '@/lib/status';
import { cx } from '@/lib/cx';

/**
 * <OrderTimeline status="shipped" events={{ pending: '2026-09-01T…', paid: '2026-09-01T…' }} />
 * `events` is optional: status -> ISO date, shown under each reached step.
 * A cancelled order shows only the steps it actually reached, then "Cancelled".
 */
export default function OrderTimeline({ status, events = {}, className }) {
  const cancelled = status === ORDER_STATUS.CANCELLED;
  const steps = cancelled
    ? [...ORDER_FLOW.filter((s) => s === ORDER_STATUS.PENDING || events[s]), ORDER_STATUS.CANCELLED]
    : ORDER_FLOW;
  const currentIndex = cancelled ? steps.length - 1 : Math.max(ORDER_FLOW.indexOf(status), 0);
  const finished = status === ORDER_STATUS.COMPLETED;

  return (
    <ol className={cx('relative', className)} aria-label="Order progress">
      {steps.map((step, i) => {
        const isCancelStep = step === ORDER_STATUS.CANCELLED;
        const isCurrent = i === currentIndex;
        const isDone = i < currentIndex || (isCurrent && finished);
        const isLast = i === steps.length - 1;
        const date = events[step];
        const state = isCancelStep ? 'Cancelled: ' : isDone ? 'Done: ' : isCurrent ? 'Current step: ' : 'Upcoming: ';

        return (
          <li key={step} aria-current={isCurrent && !finished ? 'step' : undefined} className={cx('relative flex gap-4', !isLast && 'pb-8')}>
            {!isLast && (
              <span
                aria-hidden="true"
                className={cx('absolute top-6 bottom-0 left-3 w-px -translate-x-1/2', isDone ? 'bg-dark-brown' : 'bg-beige')}
              />
            )}

            <span
              aria-hidden="true"
              className={cx(
                'relative z-10 grid size-6 shrink-0 place-items-center rounded-full border',
                isCancelStep && 'border-brick bg-brick text-cream',
                !isCancelStep && isDone && 'border-dark-brown bg-dark-brown text-cream',
                !isCancelStep && isCurrent && !isDone && 'border-dark-brown bg-cream',
                !isCancelStep && !isCurrent && !isDone && 'border-brown/75 bg-cream'
              )}
            >
              {isCancelStep ? <CloseIcon size={14} /> : isDone ? <CheckIcon size={14} /> : isCurrent ? <span className="size-2 rounded-full bg-dark-brown" /> : null}
            </span>

            <div className="min-w-0 pt-0.5">
              <p className={cx('leading-tight font-medium', !isCurrent && !isDone && !isCancelStep && 'text-brown')}>
                <span className="sr-only">{state}</span>
                {getStatusMeta('order', step).step}
              </p>
              {date && <p className="mt-0.5 text-meta">{formatDate(date)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
