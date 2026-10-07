import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

export default function NotFoundPage() {
  return (
    <section className="container-page py-24 md:py-32">
      <p className="text-meta">Error 404</p>
      <h1 className="display-lg mt-3 max-w-2xl">This piece has already left the rack.</h1>
      <p className="mt-6 max-w-md text-brown">
        The page you are looking for does not exist or has moved.
      </p>
      <Link to={ROUTES.explore} className="link-underline mt-8 inline-block font-medium">
        Browse curated pieces
      </Link>
    </section>
  );
}
