import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { cx } from '@/lib/cx';

const SIZES = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl' };

export default function Logo({ size = 'md', to = ROUTES.home, className }) {
  return (
    <Link
      to={to}
      aria-label="RE:WEAR home"
      className={cx('font-serif font-semibold tracking-tight text-dark-brown', SIZES[size], className)}
    >
      RE:WEAR
    </Link>
  );
}
