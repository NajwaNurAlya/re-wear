import { ChevronIcon } from '@/components/ui/icons';
import { cx } from '@/lib/cx';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// 1 … 4 5 6 … 12  (always shows first, last and the pages around the current one)
export function getPageItems(page, total, siblings = 1) {
  const slots = siblings * 2 + 5;
  if (total <= slots) return range(1, total);

  const left = Math.max(page - siblings, 1);
  const right = Math.min(page + siblings, total);
  const dotsLeft = left > 2;
  const dotsRight = right < total - 1;
  const edge = 3 + siblings * 2;

  if (!dotsLeft && dotsRight) return [...range(1, edge), 'dots-right', total];
  if (dotsLeft && !dotsRight) return [1, 'dots-left', ...range(total - edge + 1, total)];
  return [1, 'dots-left', ...range(left, right), 'dots-right', total];
}

const stepClass =
  'inline-flex min-h-10 items-center gap-1 border border-transparent px-3 text-sm transition-colors ' +
  'hover:border-brown/50 disabled:pointer-events-none disabled:opacity-40';

export default function Pagination({ page, totalPages, onPageChange, siblings = 1, className }) {
  if (!totalPages || totalPages <= 1) return null;

  const items = getPageItems(page, totalPages, siblings);

  return (
    <nav aria-label="Pagination" className={cx('flex items-center justify-center gap-1', className)}>
      <button type="button" className={stepClass} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronIcon direction="left" size={16} />
        Previous
      </button>

      {/* Small screens: a compact summary instead of the number row */}
      <p className="px-3 text-sm text-brown sm:hidden" aria-live="polite">
        Page {page} of {totalPages}
      </p>

      <ul className="hidden items-center gap-1 sm:flex">
        {items.map((item) =>
          typeof item === 'string' ? (
            <li key={item} aria-hidden="true" className="w-8 text-center text-brown">…</li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => item !== page && onPageChange(item)}
                className={cx(
                  'grid size-10 place-items-center border text-sm transition-colors',
                  item === page
                    ? 'border-dark-brown bg-dark-brown text-cream'
                    : 'border-transparent hover:border-brown/50'
                )}
              >
                {item}
              </button>
            </li>
          )
        )}
      </ul>

      <button type="button" className={stepClass} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
        <ChevronIcon direction="right" size={16} />
      </button>
    </nav>
  );
}
