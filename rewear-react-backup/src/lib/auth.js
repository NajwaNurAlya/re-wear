import { ROLES } from '@/constants';
import { ROUTES } from '@/constants/routes';

const isUnder = (pathname, base) => pathname === base || pathname.startsWith(`${base}/`);

// Pages that only buyers and sellers can use (admins have no cart, wishlist or orders).
const SHOPPING_BASES = [ROUTES.wishlist, ROUTES.cart, ROUTES.checkout, '/order-confirmation', ROUTES.orders];

/** Where each role lands by default after signing in. */
export function homeRouteFor(role) {
  if (role === ROLES.SELLER) return ROUTES.seller.root;
  if (role === ROLES.ADMIN) return ROUTES.admin.root;
  return ROUTES.home;
}

/** Mirrors the <ProtectedRoute> rules in App.jsx, so a saved destination is only reused when the role may open it. */
export function canAccessPath(role, pathname) {
  if (isUnder(pathname, ROUTES.seller.base)) return role === ROLES.SELLER;
  if (isUnder(pathname, ROUTES.admin.base)) return role === ROLES.ADMIN;
  if (SHOPPING_BASES.some((b) => isUnder(pathname, b))) return role === ROLES.BUYER || role === ROLES.SELLER;
  if (isUnder(pathname, ROUTES.profile)) return Boolean(role);
  return true;
}

/**
 * Destination after login/register. `from` is the location a route guard remembered
 * (a router location object or a path string). Falls back to the role's home.
 */
export function postAuthRoute(role, from) {
  const path = typeof from === 'string' ? from : from ? `${from.pathname ?? ''}${from.search ?? ''}${from.hash ?? ''}` : '';
  const pathname = path.split(/[?#]/)[0];
  const authPages = [ROUTES.login, ROUTES.register];
  if (path && pathname.startsWith('/') && !pathname.startsWith('//') && !authPages.includes(pathname) && canAccessPath(role, pathname)) return path;
  return homeRouteFor(role);
}
