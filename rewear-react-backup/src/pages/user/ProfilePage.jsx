import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const { user, role } = useAuth();
  const links = [
    ...(role !== 'admin' ? [{ title: 'Order history', copy: 'Follow the progress of your orders.', to: ROUTES.orders, action: 'View orders' }] : []),
    ...(role !== 'admin' ? [{ title: 'Wishlist', copy: 'Keep a short list of pieces you love.', to: ROUTES.wishlist, action: 'View wishlist' }] : []),
    ...(role === 'seller' ? [{ title: 'Seller studio', copy: 'Manage your listings and incoming orders.', to: ROUTES.seller.root, action: 'Open studio' }] : []),
    ...(role === 'admin' ? [{ title: 'Curator desk', copy: 'Review pieces and manage the storefront.', to: ROUTES.admin.root, action: 'Open desk' }] : []),
  ];

  return (
    <section className="container-page py-10 md:py-14" aria-labelledby="profile-title">
      <p className="text-meta uppercase tracking-[0.16em]">Your account</p>
      <h1 id="profile-title" className="display-lg mt-2">Profile</h1>
      <p className="mt-3 max-w-xl text-brown">Your RE:WEAR account details and the places you visit most.</p>

      <div className="mt-8 grid gap-10 border-t border-beige pt-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="account-details-title">
          <h2 id="account-details-title" className="title">Account details</h2>
          <dl className="mt-4 max-w-2xl divide-y divide-beige border-y border-beige">
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]"><dt className="text-sm text-brown">Name</dt><dd className="font-medium">{user?.fullName ?? '—'}</dd></div>
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]"><dt className="text-sm text-brown">Email</dt><dd className="font-medium break-all">{user?.email ?? '—'}</dd></div>
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]"><dt className="text-sm text-brown">Account type</dt><dd className="font-medium capitalize">{role ?? 'member'}</dd></div>
          </dl>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-brown">Your account details are shown here for reference. Editing your profile is not available yet.</p>
        </section>

        <aside className="h-fit border border-beige bg-white/35 p-5 md:p-6" aria-labelledby="quick-links-title">
          <h2 id="quick-links-title" className="title">Your shortcuts</h2>
          <ul className="mt-3 divide-y divide-beige">
            {links.map((item) => (
              <li key={item.to} className="py-4 first:pt-1 last:pb-1">
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-1 text-sm text-brown">{item.copy}</p>
                <Link to={item.to} className="link-underline mt-2 inline-block text-sm">{item.action}</Link>
              </li>
            ))}
          </ul>
          <Button to={ROUTES.home} variant="secondary" fullWidth className="mt-5">Back to the storefront</Button>
        </aside>
      </div>
    </section>
  );
}
