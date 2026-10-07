import { Link } from 'react-router-dom';
import { cx } from '@/lib/cx';

/**
 * Heading for a page section: a hairline rule, a title, optional one-line description,
 * and optional link on the right (collapses below the title on mobile).
 * `id` goes on the heading so a wrapping <section aria-labelledby={id}> is named.
 * <SectionHeader id="picks" title="Curator's picks" description="…" action={{ label: 'See all', to: '/explore' }} />
 */
export default function SectionHeader({ id, title, description, action, as: Heading = 'h2', className }) {
  return (
    <div className={cx('flex flex-col gap-4 border-t border-dark-brown pt-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8', className)}>
      <div className="max-w-2xl">
        <Heading id={id} className="display-md">{title}</Heading>
        {description && <p className="mt-3 text-brown">{description}</p>}
      </div>
      {action && (
        <Link to={action.to} className="link-underline shrink-0 text-sm font-medium whitespace-nowrap">
          {action.label}
        </Link>
      )}
    </div>
  );
}
