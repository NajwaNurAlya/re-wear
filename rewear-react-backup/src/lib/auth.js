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

/**
 * Message safe to show for a failed auth call. The adapters throw AuthError with end-user wording
 * (raw provider errors are never put in `message`), so it is shown as is. Anything else (a bug, an
 * unexpected rejection) gets the fallback instead of leaking its text.
 */
export function authErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.name === 'AuthError' && err.message ? err.message : fallback;
}

/** How loading the signed-in person's profile went. `null` in AuthContext means nobody is signed in. */
export const PROFILE_STATUS = { READY: 'ready', MISSING: 'missing', ERROR: 'error' };

const KNOWN_ROLES = Object.values(ROLES);

/**
 * Turns an auth identity ({ id, email, fullName }) into the account the app works with. Never throws.
 *
 *   getProfile(userId) -> { id, fullName, email, role } | null      (profileService.getProfile)
 *
 * Returns { user, profile, profileStatus }:
 *   READY    profile found. user.role = profile.role, the ONLY source of the app role.
 *   MISSING  signed in, but there is no profile row (or it is unusable). user.role = null: no privileges.
 *   ERROR    the profile could not be read (network, RLS...). user.role = null: no privileges.
 *
 * Any `role` on the auth identity (the mock adapter returns one, a Supabase user_metadata could carry one)
 * is ignored on purpose. Only buyer / seller / admin are accepted from a profile; anything else is "no role".
 */
export async function resolveAccount(authUser, getProfile) {
  if (!authUser) return { user: null, profile: null, profileStatus: null };

  let profile = null;
  let profileStatus;
  try {
    const found = await getProfile(authUser.id);
    // A profile must belong to this person and carry a known role; otherwise treat it as absent.
    const usable = found && found.id === authUser.id && KNOWN_ROLES.includes(found.role);
    profile = usable ? found : null;
    profileStatus = usable ? PROFILE_STATUS.READY : PROFILE_STATUS.MISSING;
  } catch (err) {
    profileStatus = PROFILE_STATUS.ERROR;
    if (import.meta.env?.DEV) console.warn('[profile]', err?.code ?? err?.name, err?.message);
  }

  return {
    user: {
      id: authUser.id,
      email: authUser.email || profile?.email || '',
      fullName: profile?.fullName || authUser.fullName || '',
      role: profile ? profile.role : null,
    },
    profile,
    profileStatus,
  };
}
