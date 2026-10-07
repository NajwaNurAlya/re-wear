import { useId, useState } from 'react';
import { StarIcon } from '@/components/ui/icons';
import { cx } from '@/lib/cx';

/**
 * Read-only:    <RatingStars value={4.5} count={12} />
 * Interactive:  <RatingStars value={rating} onChange={setRating} label="Your rating" />
 * Read-only values support halves (4.5 renders a half star).
 */
export default function RatingStars({ value = 0, max = 5, count, size = 18, onChange, label = 'Rating', className }) {
  const name = useId();
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  if (onChange) {
    return (
      <fieldset className={cx('flex items-center gap-0.5', className)} onMouseLeave={() => setHover(0)}>
        <legend className="sr-only">{label}</legend>
        {Array.from({ length: max }, (_, i) => {
          const n = i + 1;
          return (
            <label key={n} className="relative cursor-pointer p-0.5" onMouseEnter={() => setHover(n)}>
              <input
                type="radio"
                name={name}
                value={n}
                checked={Math.round(value) === n}
                onChange={() => onChange(n)}
                className="peer sr-only"
              />
              <span className="sr-only">{n} {n === 1 ? 'star' : 'stars'}</span>
              <StarIcon
                size={size + 4}
                filled={n <= shown}
                className="text-ochre peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-dark-brown"
              />
            </label>
          );
        })}
      </fieldset>
    );
  }

  const clamped = Math.max(0, Math.min(max, value));
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <span role="img" aria-label={`Rated ${clamped} out of ${max}`} className="inline-flex">
        {Array.from({ length: max }, (_, i) => {
          const fill = Math.max(0, Math.min(1, clamped - i)); // 0, 0..1, 1
          return (
            <span key={i} className="relative inline-flex" style={{ width: size, height: size }}>
              <StarIcon size={size} className="absolute inset-0 text-brown/75" />
              {fill > 0 && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                  <StarIcon size={size} filled className="text-ochre" />
                </span>
              )}
            </span>
          );
        })}
      </span>
      {count !== undefined && <span className="text-meta">({count})</span>}
    </span>
  );
}
