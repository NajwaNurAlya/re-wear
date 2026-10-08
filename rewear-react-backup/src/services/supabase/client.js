import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

function readJwtRole(token) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded)?.role ?? null;
  } catch {
    return null;
  }
}

const keyRole = readJwtRole(anonKey);

if (keyRole === 'service_role') {
  throw new Error('VITE_SUPABASE_ANON_KEY must never contain a Supabase service_role key.');
}

export const supabaseEnv = {
  url,
  hasUrl: Boolean(url),
  hasAnonKey: Boolean(anonKey),
  isConfigured: Boolean(url && anonKey),
};

export const supabase = supabaseEnv.isConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
