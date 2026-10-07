import { NavLink } from 'react-router-dom';
import Logo from '@/components/common/Logo';
import SkipLink from '@/components/common/SkipLink';
import { cx } from '@/lib/cx';

const itemClass = ({ isActive }) =>
  cx(
    'flex items-center justify-between gap-3 border-b-2 px-1 py-2 text-sm whitespace-nowrap transition-colors',
    'lg:border-b-0 lg:border-l-2 lg:py-1.5 lg:pl-4',
    isActive ? 'border-dark-brown font-medium text-dark-brown' : 'border-transparent text-brown hover:text-dark-brown'
  );

/**
 * Dashboard navigation. A tab-like row on small screens, a sticky column from lg up.
 * items: [{ label, to, end?, badge? }]   badge: e.g. the number of products waiting for review.
 * footer: node pinned to the bottom of the column on lg (e.g. a "View storefront" link).
 */
export default function Sidebar({ title, items, footer, className }) {
  return (
    <aside
      className={cx(
        'flex flex-col border-b border-beige px-5 py-4 sm:px-8',
        'lg:sticky lg:top-0 lg:h-dvh lg:self-start lg:overflow-y-auto lg:border-r lg:border-b-0 lg:py-8',
        className
      )}
    >
      <SkipLink />
      <Logo />
      <p className="mt-1 text-meta">{title}</p>

      <nav aria-label={title} className="mt-4 flex gap-5 overflow-x-auto lg:mt-8 lg:flex-col lg:gap-1">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={itemClass}>
            {i.label}
            {i.badge ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ochre px-1.5 text-xs leading-none text-cream">
                <span className="sr-only">, </span>{i.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      {footer && <div className="mt-4 text-sm lg:mt-auto lg:pt-6">{footer}</div>}
    </aside>
  );
}
