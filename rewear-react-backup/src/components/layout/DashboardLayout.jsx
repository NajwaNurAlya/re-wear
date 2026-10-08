import { Link, Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { authErrorMessage } from '@/lib/auth';

const AREAS = {
  seller: {
    title: 'Seller studio',
    items: [
      { label: 'Overview', to: ROUTES.seller.root, end: true },
      { label: 'Products', to: ROUTES.seller.products },
      { label: 'New product', to: ROUTES.seller.newProduct },
      { label: 'Orders', to: ROUTES.seller.orders },
    ],
  },
  admin: {
    title: 'Curator desk',
    items: [
      { label: 'Overview', to: ROUTES.admin.root, end: true },
      { label: 'Curation queue', to: ROUTES.admin.curation },
      { label: 'Products', to: ROUTES.admin.products },
      { label: 'Editorial', to: ROUTES.admin.editorial },
      { label: 'Users', to: ROUTES.admin.users },
      { label: 'Categories', to: ROUTES.admin.categories },
      { label: 'Orders', to: ROUTES.admin.orders },
    ],
  },
};

export default function DashboardLayout({ area }) {
  const { title, items } = AREAS[area];
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    navigate(ROUTES.home, { replace: true });
    try {
      await logout();
    } catch (err) {
      toast.error(authErrorMessage(err, 'We could not log you out. Please try again.'));
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <Sidebar
        title={title}
        items={items}
        footer={
          <div className="flex flex-col items-start gap-2">
            {user && <p className="text-meta">Signed in as {user.fullName}</p>}
            <Link to={ROUTES.home} className="link-underline">View storefront</Link>
            <button type="button" onClick={handleSignOut} className="link-underline">Log out</button>
          </div>
        }
      />
      <main id="main-content" tabIndex={-1} className="min-w-0 focus:outline-none">
        <Outlet />
      </main>
    </div>
  );
}
