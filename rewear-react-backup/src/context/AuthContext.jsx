import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveAccount } from '@/lib/auth';
import { authService, profileService } from '@/services';

export const AuthContext = createContext(null);

const SIGNED_OUT = { user: null, profile: null, profileStatus: null };
const PENDING = { ...SIGNED_OUT, loading: true };

// Two snapshots describe the same account. Used so a token refresh (Supabase emits a fresh user object
// every time) does not re-render the whole app or re-run effects that depend on `user`.
const sameUser = (a, b) =>
  a === b || Boolean(a && b && a.id === b.id && a.email === b.email && a.fullName === b.fullName && a.role === b.role);
const sameProfile = (a, b) =>
  a === b || Boolean(a && b && a.id === b.id && a.email === b.email && a.fullName === b.fullName && a.role === b.role);
const sameAccount = (a, b) => sameUser(a.user, b.user) && sameProfile(a.profile, b.profile) && a.profileStatus === b.profileStatus;

/**
 * Source of truth for authentication state in the UI.
 *
 *   const { user, profile, session, loading, isAuthenticated, role, login, register, logout } = useAuth();
 *
 * Layering:  UI -> AuthContext -> services facade (authService, profileService) -> mock | Supabase adapter.
 * This file never touches Supabase or localStorage directly, so mock mode and Supabase mode behave the same.
 *
 * Who is signed in comes from authService (an identity: id, email, name). What they are ALLOWED to be comes only from
 * the profile (profiles.role), loaded through profileService for that identity's id:
 *
 *   auth identity -> auth.uid() -> profileService.getProfile(id) -> profile.role -> role -> ProtectedRoute / UI
 *
 *   user             { id, fullName, email, role } | null. `role` is profile.role, or null while the profile is missing/unreadable.
 *   profile          { id, fullName, email, role } | null (the profiles row)
 *   profileStatus    null (signed out) | 'ready' | 'missing' | 'error'.  Signed in without a ready profile = no role, no privileges.
 *   role             'buyer' | 'seller' | 'admin' | null
 *   session          { user } | null. The adapters only expose the signed-in user, not tokens, so this is a
 *                    lightweight wrapper: it exists for consumers that want a "session" shape and is null whenever user is.
 *   isAuthenticated  true whenever there is a signed-in user, even if their profile is missing (that is not a guest).
 *   loading          true until the stored session AND its profile have been read once, so route guards never bounce a
 *                    signed-in person to /login (or decide on a role that is not known yet) during a refresh.
 *   login(creds)     -> user.  Throws AuthError (see services/authError.js); state is untouched on failure.
 *   register(data)   -> user.  Throws AuthError. `email_confirmation_required` means the account exists but there is
 *                    no session yet; the caller shows a "check your email" state and the context stays signed out.
 *   logout()         calls the service first and only then clears state. If the service fails and the session
 *                    survived, it throws and the user stays signed in.
 *   refreshProfile() re-reads the profile (e.g. after a failed read). Never throws.
 *
 * signIn / signUp / signOut are kept as aliases of login / register / logout for existing callers.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState(PENDING);
  const seq = useRef(0); // ticket of the newest sync; an older, slower one is dropped instead of overwriting it
  const inflight = useRef(null); // { id, promise } of the sync running now, so duplicate events share one profile read
  const knownId = useRef(null); // id whose data the state holds or is loading, to spot "a different person signed in"

  const commit = useCallback((account) => {
    knownId.current = account.user?.id ?? null;
    setState((prev) => (!prev.loading && sameAccount(prev, account) ? prev : { ...account, loading: false }));
  }, []);

  /** Brings the state in line with an auth identity (or null = signed out) by loading its profile. Resolves to the account. */
  const sync = useCallback(
    (authUser) => {
      if (!authUser) {
        seq.current += 1; // invalidates any profile read still in flight for the previous person
        inflight.current = null;
        commit(SIGNED_OUT);
        return Promise.resolve(SIGNED_OUT);
      }
      if (inflight.current?.id === authUser.id) return inflight.current.promise;

      const ticket = (seq.current += 1);
      if (knownId.current !== authUser.id) {
        // A different person than the state describes: drop the previous person's user and role right away.
        knownId.current = authUser.id;
        setState(PENDING);
      }
      const promise = resolveAccount(authUser, profileService.getProfile)
        .then((account) => {
          if (ticket === seq.current) commit(account);
          return account;
        })
        .finally(() => {
          if (inflight.current?.promise === promise) inflight.current = null;
        });
      inflight.current = { id: authUser.id, promise };
      return promise;
    },
    [commit]
  );

  // Session initialisation + auth state listener. Runs once; the cleanup unsubscribes, so there is one subscription at a time
  // (StrictMode's dev-only mount/unmount/mount therefore leaves exactly one listener behind).
  useEffect(() => {
    let active = true;
    const startedAt = seq.current;

    authService.getSession().then(
      // Ignored once any other source (listener, login, logout) has already told us who is signed in.
      (authUser) => active && seq.current === startedAt && sync(authUser),
      () => active && seq.current === startedAt && sync(null) // unreadable session: treat as signed out, never stay in "loading"
    );
    const unsubscribe = authService.onAuthChange?.((authUser) => {
      // Supabase calls this inside its auth lock; reading the profiles table from here can deadlock, so hand off first.
      setTimeout(() => active && sync(authUser), 0);
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [sync]);

  const login = useCallback(
    async (credentials) => {
      const authUser = await authService.signIn(credentials);
      return (await sync(authUser)).user;
    },
    [sync]
  );

  const register = useCallback(
    async (details) => {
      const authUser = await authService.signUp(details);
      return (await sync(authUser)).user;
    },
    [sync]
  );

  const logout = useCallback(async () => {
    await authService.signOut(); // really end the session first; clearing React state alone would not
    await sync(null);
  }, [sync]);

  const refreshProfile = useCallback(async () => {
    if (state.user) await sync({ id: state.user.id, email: state.user.email, fullName: state.user.fullName });
  }, [state.user, sync]);

  const value = useMemo(
    () => ({
      user: state.user,
      profile: state.profile,
      profileStatus: state.profileStatus,
      session: state.user ? { user: state.user } : null,
      role: state.user?.role ?? null,
      isAuthenticated: Boolean(state.user),
      loading: state.loading,
      login,
      register,
      logout,
      refreshProfile,
      // Aliases kept so existing callers keep working.
      signIn: login,
      signUp: register,
      signOut: logout,
    }),
    [state, login, register, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
