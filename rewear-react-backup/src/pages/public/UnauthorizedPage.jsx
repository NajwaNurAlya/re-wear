import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { ROLES } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { homeRouteFor } from '@/lib/auth';

const HOME_LABEL = { [ROLES.SELLER]: 'Go to Seller studio', [ROLES.ADMIN]: 'Go to Curator desk' };

export default function UnauthorizedPage() {
  useDocumentTitle('No access');
  const { isAuthenticated, role, loading } = useAuth();
  const showHome = !isAuthenticated || role !== ROLES.BUYER; // a buyer's primary button already goes home

  return (
    <section className="container-page py-24 md:py-32">
      <p className="text-meta">Error 403</p>
      <h1 className="display-lg mt-3 max-w-2xl">This area is not open to your account.</h1>
      <p className="mt-6 max-w-md text-brown">
        {isAuthenticated
          ? <>You are signed in as a <strong className="font-medium text-dark-brown">{role}</strong>, and that role does not have access to the page you tried to open.</>
          : 'You need to be signed in with the right account to open that page.'}
      </p>
      {!loading && (
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {isAuthenticated ? (
            <Button to={homeRouteFor(role)}>{HOME_LABEL[role] ?? 'Back to the homepage'}</Button>
          ) : (
            <Button to={ROUTES.login}>Log in</Button>
          )}
          {showHome && <Link to={ROUTES.home} className="link-underline font-medium">Back to the homepage</Link>}
        </div>
      )}
    </section>
  );
}
