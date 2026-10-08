// Supabase auth adapter (Step 2B-1, role handling changed in Step 2D). Same functions as services/mock/authService.js:
//
//   signIn({ email, password })                       -> user
//   signUp({ fullName, email, password, role })       -> user (signed in)
//   signOut()
//   getSession()                                      -> user | null
//   onAuthChange(cb)                                  -> unsubscribe
//
// A Supabase "user" here is an AUTH IDENTITY: { id, fullName, email }. It deliberately carries NO role.
// The app role comes from profiles.role, read by services/supabase/profileService.js and merged by AuthContext.
// auth.users.user_metadata is editable by the signed-in user, so it is never used for roles or privileges.
// Uses the anon client only (never service_role).
import { REGISTRABLE_ROLES } from '@/constants';
import { normalizeEmail, validateLogin, validateRegister } from '@/lib/validators';
import { AuthError } from '../authError';
import { supabase } from './client';

export { AuthError };

function requireClient() {
  if (!supabase) {
    throw new AuthError('not_configured', 'Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

/** Turns a Supabase error into an AuthError with a safe, user-facing message. Raw errors never reach the UI. */
function mapAuthError(error) {
  if (import.meta.env.DEV) console.warn('[supabase auth]', error?.code ?? error?.name, error?.message);

  const code = error?.code;
  const status = error?.status;
  const message = String(error?.message ?? '').toLowerCase();

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return new AuthError('invalid_credentials', 'Email or password is incorrect.');
  }
  if (code === 'user_already_exists' || code === 'email_exists' || message.includes('already registered')) {
    return new AuthError('email_taken', 'An account with this email already exists.', { email: 'An account with this email already exists.' });
  }
  if (code === 'weak_password') {
    return new AuthError('validation', 'Please check the highlighted fields.', { password: 'Choose a stronger password.' });
  }
  if (code === 'email_address_invalid') {
    return new AuthError('validation', 'Please check the highlighted fields.', { email: 'Enter a valid email address.' });
  }
  if (code === 'email_not_confirmed') {
    return new AuthError('email_not_confirmed', 'Please confirm your email address before logging in.');
  }
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || status === 429) {
    return new AuthError('rate_limited', 'Too many attempts. Please wait a moment and try again.');
  }
  if (code === 'signup_disabled' || code === 'email_provider_disabled') {
    return new AuthError('signup_disabled', 'Registration is currently unavailable.');
  }
  if (error?.name === 'AuthRetryableFetchError' || status === 0) {
    return new AuthError('network_error', 'Could not reach the server. Check your connection and try again.');
  }
  return new AuthError('auth_failed', 'Authentication failed. Please try again.');
}

/** Auth identity only. No role: that is profiles.role, resolved by AuthContext through the profile service. */
function toPublicUser(user) {
  if (!user) return null;
  const metadata = user.user_metadata ?? {};
  const email = normalizeEmail(user.email);
  return {
    id: user.id,
    // Display fallback until the profile (profiles.full_name) is loaded.
    fullName: metadata.full_name || metadata.fullName || metadata.name || email.split('@')[0],
    email,
  };
}

export async function signIn(credentials = {}) {
  const fields = validateLogin(credentials);
  if (Object.keys(fields).length) throw new AuthError('validation', 'Please check the highlighted fields.', fields);

  const { data, error } = await requireClient().auth.signInWithPassword({
    email: normalizeEmail(credentials.email),
    password: credentials.password,
  });
  if (error) throw mapAuthError(error);
  return toPublicUser(data.user);
}

export async function signUp(details = {}) {
  // Public registration is buyer/seller only. Admin accounts are never created here.
  if (!REGISTRABLE_ROLES.includes(details.role)) {
    throw new AuthError('role_not_allowed', 'Only buyer and seller accounts can be registered.', { role: 'Choose buyer or seller.' });
  }
  const fields = validateRegister({ ...details, confirmPassword: details.password });
  if (Object.keys(fields).length) throw new AuthError('validation', 'Please check the highlighted fields.', fields);

  const { data, error } = await requireClient().auth.signUp({
    email: normalizeEmail(details.email),
    password: details.password,
    // `role` is only a request: the signup trigger (handle_new_user) grants seller when asked and buyer otherwise.
    // The app reads the outcome from profiles.role, never from this metadata.
    options: { data: { full_name: details.fullName.trim(), role: details.role } },
  });
  if (error) throw mapAuthError(error);
  if (!data.user) throw new AuthError('auth_failed', 'Authentication failed. Please try again.');

  // With email-enumeration protection on, an already-registered email returns a user with no identities instead of an error.
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new AuthError('email_taken', 'An account with this email already exists.', { email: 'An account with this email already exists.' });
  }
  // With "Confirm email" on, the account exists but there is no session yet, so the person is NOT signed in.
  // Returning a user here would make the app look signed in while every request is anonymous.
  if (!data.session) {
    throw new AuthError('email_confirmation_required', 'Check your email to confirm your account, then log in.');
  }
  return toPublicUser(data.user);
}

export async function signOut() {
  const client = requireClient();
  // 'local' ends this browser's session only (the mock does the same) and does not sign out other devices.
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (!error) return;
  // supabase-js clears the stored session even if the request failed. Only report a failure if the session survived.
  const { data } = await client.auth.getSession();
  if (data?.session) throw mapAuthError(error);
}

/** The signed-in user, or null. */
export async function getSession() {
  const { data, error } = await requireClient().auth.getSession();
  if (error) throw mapAuthError(error);
  return toPublicUser(data.session?.user);
}

/** Calls back with the user (or null) on sign-in, sign-out, token refresh and changes made in other tabs. */
export function onAuthChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(toPublicUser(session?.user));
  });
  return () => data.subscription.unsubscribe();
}
