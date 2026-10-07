import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';

/**
 * Route guard.  <ProtectedRoute />                 -> any signed-in user
 *               <ProtectedRoute roles={['admin']} /> -> only these roles
 *
 * This is a UX guard only. Real enforcement is Supabase Row Level Security (Step 12).
 */
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="container-page py-24 text-meta">Loading…</p>;
  }
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }
  if (roles && !roles.includes(role)) {
    return <Navigate to={ROUTES.unauthorized} replace />;
  }
  return <Outlet />;
}
