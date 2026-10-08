import { useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';

/**
 * Route guard.  <ProtectedRoute />                 -> any signed-in user
 *               <ProtectedRoute roles={['admin']} /> -> only these roles
 *
 * Reads auth state from AuthContext. While the stored session and its profile are still being read (`loading`) it renders
 * a placeholder, so a refresh on a protected page never bounces a signed-in person to /login.
 *
 * The role comes from profiles.role. A signed-in person whose profile is missing or unreadable has no role, and no role
 * means no access: not even to a route that only asks for "any signed-in user".
 *
 * This is a UX guard only. Real enforcement is Supabase Row Level Security (Step 12).
 */
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();
  // True once this guard has seen a signed-in user, so "signed out while here" can be told apart from "guest arriving".
  const wasAuthenticated = useRef(false);
  if (isAuthenticated) wasAuthenticated.current = true;

  if (loading) {
    return <p className="container-page py-24 text-meta">Loading…</p>;
  }
  if (!isAuthenticated) {
    // Logged out (or the session ended in another tab) while on a protected page: go to the storefront.
    // Without this the re-render triggered by logout races the navigation to home and the person lands on /login.
    if (wasAuthenticated.current) return <Navigate to={ROUTES.home} replace />;
    // A guest who opened a protected URL: send to login and remember where they were going.
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }
  if (!role || (roles && !roles.includes(role))) {
    return <Navigate to={ROUTES.unauthorized} replace />;
  }
  return <Outlet />;
}
