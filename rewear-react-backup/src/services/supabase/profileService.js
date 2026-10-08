// Supabase profile adapter (Step 2D). Same function and shape as services/mock/profileService.js:
//
//   getProfile(userId)   -> { id, fullName, email, role } | null   (null = signed in, but no profiles row)
//
// This is the ONLY place that reads public.profiles. `profiles.role` is the single source of truth for the
// app role; auth user_metadata is never consulted. Uses the anon client only, so row level security applies:
// a signed-in user can read their own row, an admin can read every row.
import { ROLES } from '@/constants';
import { AuthError } from '../authError';
import { supabase } from './client';

const VALID_ROLES = Object.values(ROLES);

/** Row -> app shape. A role outside the enum is dropped (null), never guessed. */
function toProfile(row) {
  return {
    id: row.id,
    fullName: row.full_name ?? '',
    email: row.email ?? '',
    role: VALID_ROLES.includes(row.role) ? row.role : null,
  };
}

export async function getProfile(userId) {
  if (!supabase) {
    throw new AuthError('not_configured', 'Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  if (!userId) return null;

  // .eq('id', userId) is required even though RLS already limits normal users to their own row:
  // an admin is allowed to read ALL rows, so without it maybeSingle() would fail for them.
  const { data, error } = await supabase.from('profiles').select('id, full_name, email, role').eq('id', userId).maybeSingle();

  if (error) {
    if (import.meta.env.DEV) console.warn('[supabase profiles]', error.code ?? error.name, error.message);
    // Raw database errors never reach the UI.
    throw new AuthError('profile_failed', 'Your account profile could not be loaded. Please try again.');
  }
  return data ? toProfile(data) : null;
}

/**
 * Every member, for the admin Members page: [{ id, fullName, email, role }].
 * RLS only lets an admin read other people's rows; for anyone else this returns just their own, never someone else's.
 */
export async function listUsers() {
  if (!supabase) {
    throw new AuthError('not_configured', 'Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  const { data, error } = await supabase.from('profiles').select('id, full_name, email, role').order('created_at', { ascending: true });
  if (error) {
    if (import.meta.env.DEV) console.warn('[supabase profiles]', error.code ?? error.name, error.message);
    throw new AuthError('profile_failed', 'Members could not be loaded. Please try again.');
  }
  return (data ?? []).map(toProfile);
}
