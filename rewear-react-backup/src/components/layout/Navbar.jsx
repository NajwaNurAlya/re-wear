import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from '@/components/common/Logo';
import SkipLink from '@/components/common/SkipLink';
import Button from '@/components/ui/Button';
import SearchBar from '@/components/ui/SearchBar';
import { BagIcon, ChevronIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from '@/components/ui/icons';
import { ROLES } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { authErrorMessage } from '@/lib/auth';
import { cx } from '@/lib/cx';

const navLink = ({ isActive }) =>
  cx(
    'border-b-2 py-1 text-sm transition-colors',
    isActive ? 'border-dark-brown font-medium text-dark-brown' : 'border-transparent text-brown hover:text-dark-brown'
  );

const iconButton = 'relative grid size-11 place-items-center text-dark-brown transition-colors hover:bg-beige/60';

function CountBadge({ count }) {
  if (!count) return null;
  return (
    <span aria-hidden="true" className="absolute top-1.5 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-dark-brown px-1 text-[10px] leading-none text-cream">
      {count > 99 ? '99+' : count}
    </span>
  );
}

// Disclosure menu for the signed-in account (not an ARIA "menu": it is just a list of links).
function AccountMenu({ user, items, onSignOut }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-1.5 px-2 text-sm transition-colors hover:bg-beige/60"
      >
        <UserIcon size={20} />
        <span className="max-w-28 truncate">{user?.fullName?.split(' ')[0] ?? 'Account'}</span>
        <ChevronIcon size={16} direction={open ? 'up' : 'down'} />
      </button>

      {open && (
        <div id={panelId} className="absolute top-full right-0 z-50 mt-1 w-56 border border-brown/30 bg-cream py-1">
          {user && (
            <div className="border-b border-beige px-4 py-2.5">
              <p className="truncate text-sm font-medium">{user.fullName}</p>
              <p className="truncate text-meta">{user.email}</p>
              <span className="tag-label mt-1.5">{user.role ?? 'No profile'}</span>
            </div>
          )}
          {items.map((i) => (
            <Link key={i.to} to={i.to} className="block px-4 py-2.5 text-sm hover:bg-beige/60">{i.label}</Link>
          ))}
          {onSignOut && (
            <button type="button" onClick={onSignOut} className="block w-full border-t border-beige px-4 py-2.5 text-left text-sm hover:bg-beige/60">
              Log out
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Storefront header. Cart and wishlist counts come in as props (PublicLayout reads the contexts).
 * Shows Log in / Register for guests and the account menu (name, role, Log out) when signed in.
 * Search submits to  /explore?q=<query>  (the Explore page reads `q` in Step 6).
 */
export default function Navbar({ cartCount = 0, wishlistCount = 0 }) {
  const { isAuthenticated, role, user, loading, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchToggle = useRef(null);
  const menuId = useId();

  // Close the mobile panel and the search row whenever the page changes.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const isBuyer = role === ROLES.BUYER;
  const isSeller = role === ROLES.SELLER;
  const isAdmin = role === ROLES.ADMIN;
  const accountItems = isBuyer
    ? [
        { label: 'My orders', to: ROUTES.orders },
        { label: 'Profile', to: ROUTES.profile },
      ]
    : isSeller
      ? [
          { label: 'Seller Dashboard', to: ROUTES.seller.root },
          { label: 'Products', to: ROUTES.seller.products },
          { label: 'Sales', to: ROUTES.seller.orders },
          { label: 'Profile', to: ROUTES.profile },
        ]
      : isAdmin
        ? [
            { label: 'Admin Dashboard', to: ROUTES.admin.root },
            { label: 'Products', to: ROUTES.admin.products },
            { label: 'Orders', to: ROUTES.admin.orders },
            { label: 'Editorial', to: ROUTES.admin.editorial },
            { label: 'Users', to: ROUTES.admin.users },
            { label: 'Profile', to: ROUTES.profile },
          ]
        : [{ label: 'Profile', to: ROUTES.profile }];
  // Leave the current page first (it may be a protected one), then clear the session.
  const handleSignOut = async () => {
    setMenuOpen(false);
    navigate(ROUTES.home, { replace: true });
    try {
      await logout();
    } catch (err) {
      toast.error(authErrorMessage(err, 'We could not log you out. Please try again.'));
    }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    searchToggle.current?.focus();
  };

  return (
    <>
      <SkipLink />
      <header className="sticky top-0 z-40 border-b border-beige bg-cream">
        <div className="container-page flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-10">
            <Logo />
            <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
              <NavLink to={ROUTES.explore} className={navLink}>Explore</NavLink>
              <NavLink to={ROUTES.editorial} className={navLink}>Editorial</NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <button
              ref={searchToggle}
              type="button"
              aria-label={searchOpen ? 'Close search' : 'Search'}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((o) => !o)}
              className={iconButton}
            >
              {searchOpen ? <CloseIcon /> : <SearchIcon />}
            </button>

            {isBuyer && (
              <>
                <Link to={ROUTES.wishlist} aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} saved` : ''}`} className={iconButton}>
                  <HeartIcon />
                  <CountBadge count={wishlistCount} />
                </Link>
                <Link to={ROUTES.cart} aria-label={`Cart${cartCount ? `, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : ''}`} className={iconButton}>
                  <BagIcon />
                  <CountBadge count={cartCount} />
                </Link>
              </>
            )}

            <div className="ml-2 hidden items-center gap-2 md:flex">
              {loading ? (
                // Session still being read: reserve the space instead of flashing Log in / Register at a signed-in user.
                <div aria-hidden="true" className="h-11 w-40" />
              ) : isAuthenticated ? (
                <AccountMenu user={user} items={accountItems} onSignOut={handleSignOut} />
              ) : (
                <>
                  <Button to={ROUTES.login} variant="ghost" size="sm">Log in</Button>
                  <Button to={ROUTES.register} size="sm">Register</Button>
                </>
              )}
            </div>

            <button
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((o) => !o)}
              className={cx(iconButton, 'md:hidden')}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-beige" onKeyDown={(e) => e.key === 'Escape' && closeSearch()}>
            <div className="container-page py-3">
              <SearchBar
                autoFocus
                onSubmit={(q) => {
                  setSearchOpen(false);
                  navigate(q ? `${ROUTES.explore}?q=${encodeURIComponent(q)}` : ROUTES.explore);
                }}
              />
            </div>
          </div>
        )}

        {/* Mobile panel */}
        {menuOpen && (
          <nav id={menuId} aria-label="Menu" className="border-t border-beige md:hidden">
            <ul className="container-page flex flex-col py-2 text-base">
              {[
                { label: 'Explore', to: ROUTES.explore },
                { label: 'Editorial', to: ROUTES.editorial },
                ...(isAuthenticated ? accountItems : [{ label: 'Log in', to: ROUTES.login }, { label: 'Register', to: ROUTES.register }]),
              ].map((i) => (
                <li key={i.to} className="border-b border-beige last:border-0">
                  <NavLink to={i.to} className={({ isActive }) => cx('block py-3', isActive && 'font-medium')}>{i.label}</NavLink>
                </li>
              ))}
              {isAuthenticated && (
                <li>
                  <button type="button" onClick={handleSignOut} className="block w-full py-3 text-left">Log out</button>
                </li>
              )}
            </ul>
          </nav>
        )}
      </header>
    </>
  );
}
