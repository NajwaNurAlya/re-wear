import { Link } from 'react-router-dom';
import Spinner from '@/components/ui/Spinner';
import { cx } from '@/lib/cx';

const BASE =
  'inline-flex items-center justify-center gap-2 border font-medium whitespace-nowrap select-none ' +
  'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-50';

const VARIANTS = {
  primary: 'border-dark-brown bg-dark-brown text-cream hover:border-brown hover:bg-brown',
  secondary: 'border-dark-brown bg-transparent text-dark-brown hover:bg-dark-brown hover:text-cream',
  soft: 'border-transparent bg-beige text-dark-brown hover:bg-muted-pink',
  ghost: 'border-transparent bg-transparent text-dark-brown hover:bg-beige/60',
  danger: 'border-brick bg-brick text-cream hover:border-dark-brown hover:bg-dark-brown',
  'danger-outline': 'border-brick bg-transparent text-brick hover:bg-brick hover:text-cream',
};

const SIZES = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-12 px-7 text-base',
};
const ICON_SIZES = { sm: 'size-9', md: 'size-11', lg: 'size-12' };

/**
 * <Button>Save</Button>
 * <Button to="/explore">Browse</Button>        renders a router <Link>
 * <Button href="https://…">External</Button>   renders an <a>
 * <Button iconOnly aria-label="Close">…</Button>
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  iconOnly = false,
  iconLeft,
  iconRight,
  to,
  href,
  disabled = false,
  type = 'button',
  className,
  children,
  ...rest
}) {
  const classes = cx(
    BASE,
    VARIANTS[variant],
    iconOnly ? ICON_SIZES[size] : SIZES[size],
    fullWidth && 'w-full',
    className
  );
  const isDisabled = disabled || loading;

  const content = (
    <>
      {loading ? <Spinner size={16} decorative /> : iconLeft}
      {children}
      {!loading && iconRight}
    </>
  );

  if (to || href) {
    const linkProps = {
      className: classes,
      'aria-disabled': isDisabled || undefined,
      tabIndex: isDisabled ? -1 : undefined,
      'aria-busy': loading || undefined,
      ...rest,
    };
    return to ? (
      <Link to={to} {...linkProps}>{content}</Link>
    ) : (
      <a href={href} {...linkProps}>{content}</a>
    );
  }

  return (
    <button type={type} className={classes} disabled={isDisabled} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}
