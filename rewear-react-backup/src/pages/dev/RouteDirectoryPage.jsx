import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';

// DEV ONLY. The route directory from Step 2, kept (moved out of the homepage in Step 5) for
// clicking every route and checking what the route guards allow for the current role.
// Reachable at /dev/routes under `vite dev`. Delete before launch.
const GROUPS = [
  {
    title: 'Public',
    links: [
      ['Home', ROUTES.home], ['Explore', ROUTES.explore], ['Product detail', ROUTES.product('demo-1')],
      ['Editorial', ROUTES.editorial], ['Editorial article', ROUTES.editorialDetail('how-to-read-a-vintage-label')],
      ['Log in', ROUTES.login], ['Register', ROUTES.register], ['Unauthorized', ROUTES.unauthorized],
      ['Unknown URL (404)', '/this-does-not-exist'],
      ...(import.meta.env.DEV ? [['Component gallery (dev only)', ROUTES.dev.components], ['Route directory (dev only)', ROUTES.dev.routes]] : []),
    ],
  },
  {
    title: 'Signed in (buyer or seller)',
    links: [
      ['Profile (any role)', ROUTES.profile], ['Wishlist', ROUTES.wishlist], ['Cart', ROUTES.cart],
      ['Checkout', ROUTES.checkout], ['Order confirmation', ROUTES.orderConfirmation('demo-1')],
      ['Orders', ROUTES.orders], ['Order detail', ROUTES.order('demo-1')],
    ],
  },
  {
    title: 'Seller only',
    links: [
      ['Dashboard', ROUTES.seller.root], ['Products', ROUTES.seller.products], ['New product', ROUTES.seller.newProduct],
      ['Edit product', ROUTES.seller.editProduct('demo-1')], ['Orders', ROUTES.seller.orders],
    ],
  },
  {
    title: 'Admin only',
    links: [
      ['Dashboard', ROUTES.admin.root], ['Products', ROUTES.admin.products], ['Curation', ROUTES.admin.curation],
      ['Users', ROUTES.admin.users], ['Categories', ROUTES.admin.categories], ['Orders', ROUTES.admin.orders],
    ],
  },
];

export default function RouteDirectoryPage() {
  const { role } = useAuth();

  return (
    <section className="container-page py-16 md:py-24">
      <h1 className="display-xl">RE:WEAR</h1>
      <p className="mt-4 font-serif text-xl italic text-brown md:text-2xl">Curated pieces. Second stories.</p>

      <div className="mt-12 border-t border-beige pt-6">
        <p className="text-sm">
          <span className="text-brown">Test mode · </span>
          {role ? <>signed in as <span className="tag-label ml-1">{role}</span></> : 'not signed in'}
        </p>
        <p className="mt-1 max-w-xl text-meta">
          Development scaffolding. Log in with a demo account (see the login page), then use this list to click every
          route and confirm which ones the route guards allow for that role.
        </p>
      </div>

      <div className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h2 className="title">{g.title}</h2>
            <ul className="mt-4 space-y-2 border-t border-beige pt-4 text-sm">
              {g.links.map(([label, to]) => (
                <li key={`${g.title}-${label}`}>
                  <Link to={to} className="link-underline">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
