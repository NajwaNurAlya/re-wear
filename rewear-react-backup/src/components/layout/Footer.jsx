import { Link } from 'react-router-dom';
import Logo from '@/components/common/Logo';
import { ROLES } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';

function LinkGroup({ title, links }) {
  return (
    <nav aria-label={title}>
      <h2 className="title text-lg">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="link-underline">{l.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  const { isAuthenticated, role } = useAuth();
  const isBuyer = role === ROLES.BUYER;
  const isSeller = role === ROLES.SELLER;
  const isAdmin = role === ROLES.ADMIN;

  const shop = [
    { label: 'Explore', to: ROUTES.explore },
    { label: 'Editorial', to: ROUTES.editorial },
  ];
  const account = isAuthenticated
    ? isBuyer
      ? [
          { label: 'My orders', to: ROUTES.orders },
          { label: 'Wishlist', to: ROUTES.wishlist },
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
          : [{ label: 'Profile', to: ROUTES.profile }]
    : [
        { label: 'Log in', to: ROUTES.login },
        { label: 'Register', to: ROUTES.register },
      ];
  const sell =
    role === ROLES.SELLER
      ? [{ label: 'Seller studio', to: ROUTES.seller.root }, { label: 'Add a piece', to: ROUTES.seller.newProduct }]
      : role === ROLES.ADMIN
        ? [{ label: 'Curator desk', to: ROUTES.admin.root }]
        : [{ label: 'Start selling', to: ROUTES.register }];

  return (
    <footer className="mt-16 border-t border-beige">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-2 font-serif text-lg text-brown italic">A second life, thoughtfully chosen.</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-brown">
            RE:WEAR is a considered edit of vintage and preloved clothing. We make room for the details that help each piece find the right next owner: its story, era, condition and fit.
          </p>
          <p className="mt-5 text-meta uppercase tracking-[0.14em]">Vintage · Preloved · One of a kind</p>
        </div>
        <LinkGroup title="Shop" links={shop} />
        <LinkGroup title="Account" links={account} />
        <LinkGroup title="Sell" links={sell} />
      </div>
      <div className="border-t border-beige">
        <p className="container-page py-5 text-meta">© {new Date().getFullYear()} RE:WEAR</p>
      </div>
    </footer>
  );
}
