// Mock authentication (Step 8): accounts and the session live in localStorage.
// The Supabase adapter (services/supabase/authService.js) exposes the same functions, so AuthContext does not change.
//
//   signIn({ email, password })                       -> user
//   signUp({ fullName, email, password, role })       -> user (signed in)
//   signOut()
//   getSession()                                      -> user | null
//   onAuthChange(cb)                                  -> unsubscribe (other tabs signing in/out)
//   demoAccounts                                      mock only: shown on the login page
//
// A "user" is { id, fullName, email, role }. Passwords never leave this file.
// NOTE: this is a demo. Hashing here only avoids storing plain text; it is NOT real security.
import { REGISTRABLE_ROLES } from '@/constants';
import { normalizeEmail, validateRegister } from '@/lib/validators';
import { AuthError } from '../authError';
import { demoUsers } from './seed';

const USERS_KEY = 'rewear.users'; // accounts registered in this browser (demo accounts are in the seed)
const SESSION_KEY = 'rewear.session'; // { userId }

// AuthError lives in ../authError so the mock and Supabase adapters throw the same type.
export { AuthError };

/* ------------------------------------------------------------------ storage */
// localStorage with an in-memory fallback (private mode, blocked storage), so auth still works for the session.
const memory = new Map();
const store = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      return memory.has(key) ? memory.get(key) : null;
    }
  },
  set(key, value) {
    memory.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* kept in memory only */
    }
  },
  remove(key) {
    memory.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing to do */
    }
  },
};

const storedUsers = () => {
  const list = store.get(USERS_KEY);
  return Array.isArray(list) ? list : [];
};

/* ------------------------------------------------------------------- helpers */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const toPublic = ({ id, fullName, email, role }) => ({ id, fullName, email, role });
const allUsers = () => [...demoUsers, ...storedUsers()];
const findByEmail = (email) => allUsers().find((u) => u.email === email);
const findById = (id) => allUsers().find((u) => u.id === id);

async function hashPassword(email, password) {
  const input = `rewear:${email}:${password}`;
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Insecure contexts (plain http on a LAN address) have no SubtleCrypto: fall back to a simple non-cryptographic hash.
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return `fallback-${h}`;
}

const passwordMatches = async (user, password) =>
  (user.passwordHash ?? (await hashPassword(user.email, user.password))) === (await hashPassword(user.email, password));

const newId = () => `user-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ----------------------------------------------------------------------- API */
export const demoAccounts = demoUsers.map(({ email, password, role, fullName }) => ({ email, password, role, fullName }));

export async function listUsers() {
  return allUsers().map(({ id, fullName, email, role }) => ({ id, fullName, email, role }));
}

export async function signIn({ email, password } = {}) {
  await delay();
  const user = findByEmail(normalizeEmail(email));
  // One message for "no such email" and "wrong password", so the form never reveals which emails exist.
  if (!user || !password || !(await passwordMatches(user, password))) {
    throw new AuthError('invalid_credentials', 'Email or password is incorrect.');
  }
  store.set(SESSION_KEY, { userId: user.id });
  return toPublic(user);
}

export async function signUp({ fullName, email, password, role } = {}) {
  await delay();
  // Public registration is buyer/seller only. Admin accounts are seeded, never created here.
  if (!REGISTRABLE_ROLES.includes(role)) {
    throw new AuthError('role_not_allowed', 'Only buyer and seller accounts can be registered.', { role: 'Choose buyer or seller.' });
  }
  const fields = validateRegister({ fullName, email, password, confirmPassword: password, role });
  if (Object.keys(fields).length) throw new AuthError('validation', 'Please check the highlighted fields.', fields);

  const normalized = normalizeEmail(email);
  if (findByEmail(normalized)) {
    throw new AuthError('email_taken', 'An account with this email already exists.', { email: 'An account with this email already exists.' });
  }

  const user = { id: newId(), fullName: fullName.trim(), email: normalized, role, passwordHash: await hashPassword(normalized, password) };
  store.set(USERS_KEY, [...storedUsers(), user]);
  store.set(SESSION_KEY, { userId: user.id });
  return toPublic(user);
}

export async function signOut() {
  store.remove(SESSION_KEY);
}

/** The signed-in user, or null. The role is always re-read from the account, never trusted from the session. */
export async function getSession() {
  const session = store.get(SESSION_KEY);
  const user = session?.userId ? findById(session.userId) : null;
  if (!user) {
    if (session) store.remove(SESSION_KEY); // stale or tampered session
    return null;
  }
  return toPublic(user);
}

/** Calls back when another tab signs in or out, so every tab agrees. */
export function onAuthChange(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    if (e.key === SESSION_KEY || e.key === null) getSession().then(callback);
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
