// Mock profile adapter (Step 2D). Same function and shape as services/supabase/profileService.js:
//
//   getProfile(userId)   -> { id, fullName, email, role } | null
//
// The mock "profiles table" is the account list that mock/authService already owns (seed demo users plus
// accounts registered in this browser). No second store is kept here, so a demo user's role is defined in one place.
import { listUsers } from './authService';

export async function getProfile(userId) {
  if (!userId) return null;
  const account = (await listUsers()).find((u) => u.id === userId);
  return account ? { id: account.id, fullName: account.fullName, email: account.email, role: account.role } : null;
}
