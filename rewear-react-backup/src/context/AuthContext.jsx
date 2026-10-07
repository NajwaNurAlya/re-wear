import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services';

export const AuthContext = createContext(null);

/**
 * Session state for the whole app (Step 8). All account work goes through authService, so
 * moving from mock/localStorage to Supabase does not change this file.
 *
 *   const { user, role, isAuthenticated, loading, signIn, signUp, signOut } = useAuth();
 *
 * `loading` is true until the stored session has been read, so route guards never bounce a
 * signed-in person to the login page while a refresh is still restoring the session.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true });

  useEffect(() => {
    let active = true;
    const apply = (user) => active && setState({ user: user ?? null, loading: false });

    authService.getSession().then(apply, () => apply(null));
    const unsubscribe = authService.onAuthChange?.(apply);
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async (credentials) => {
    const user = await authService.signIn(credentials);
    setState({ user, loading: false });
    return user;
  }, []);

  const signUp = useCallback(async (details) => {
    const user = await authService.signUp(details);
    setState({ user, loading: false });
    return user;
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setState({ user: null, loading: false });
  }, []);

  const value = useMemo(
    () => ({
      user: state.user,
      role: state.user?.role ?? null,
      isAuthenticated: Boolean(state.user),
      loading: state.loading,
      signIn,
      signUp,
      signOut,
    }),
    [state, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
