// Single entry point for data access. Pages and hooks import from '@/services' only,
// never from a specific adapter, so switching data sources touches this file alone.
//
//   VITE_DATA_SOURCE=mock       seed data in services/mock (default)
//   VITE_DATA_SOURCE=supabase   every service uses services/supabase when VITE_SUPABASE_URL and
//                               VITE_SUPABASE_ANON_KEY are set. Without them the app falls back to mock. Without the env vars, auth stays mock.
import * as mockAuth from './mock/authService';
import * as mockProducts from './mock/productService';
import * as mockCategories from './mock/categoryService';
import * as mockEditorial from './mock/editorialService';
import * as mockOrders from './mock/orderService';
import * as mockProfiles from './mock/profileService';
import * as supabaseAuth from './supabase/authService';
import * as supabaseProfiles from './supabase/profileService';
import * as supabaseProducts from './supabase/productService';
import * as supabaseCategories from './supabase/categoryService';
import * as supabaseEditorial from './supabase/editorialService';
import * as supabaseOrders from './supabase/orderService';
import * as supabaseCart from './supabase/cartService';
import * as supabaseWishlist from './supabase/wishlistService';
import { supabaseEnv } from './supabase/client';

const SOURCE = import.meta.env.VITE_DATA_SOURCE ?? 'mock';
const USE_SUPABASE_AUTH = SOURCE === 'supabase' && supabaseEnv.isConfigured;

if (SOURCE !== 'mock' && import.meta.env.DEV) {
  if (USE_SUPABASE_AUTH) console.info('Supabase services are active (auth, profiles, products, categories, editorial, cart, wishlist, orders).');
  else if (SOURCE === 'supabase') console.warn('VITE_DATA_SOURCE="supabase" but VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. Falling back to mock data.');
  else console.warn(`Unknown VITE_DATA_SOURCE="${SOURCE}". Falling back to mock data.`);
}

export const authService = USE_SUPABASE_AUTH ? { ...supabaseAuth, listUsers: supabaseProfiles.listUsers } : mockAuth;
export const profileService = USE_SUPABASE_AUTH ? supabaseProfiles : mockProfiles;
export const productService = USE_SUPABASE_AUTH ? supabaseProducts : mockProducts;
// Categories MUST follow products: products.category_id is a UUID in Supabase, so mixing a mock category list
// (ids like "cat-tops") with Supabase products would break every category filter, label and count.
export const categoryService = USE_SUPABASE_AUTH ? supabaseCategories : mockCategories;
export const editorialService = USE_SUPABASE_AUTH ? supabaseEditorial : mockEditorial;
export const orderService = USE_SUPABASE_AUTH ? supabaseOrders : mockOrders;

// Bag and wishlist: stored per account in Supabase, or in this browser (mock mode, and signed-out guests in either mode).
// `cartService` / `wishlistService` are null in mock mode: the contexts then use the local lists only.
export const cartService = USE_SUPABASE_AUTH ? supabaseCart : null;
export const wishlistService = USE_SUPABASE_AUTH ? supabaseWishlist : null;
export { localCart, localWishlist } from './localLists';

/** True when the app talks to a real backend (so UI copy must not say "saved in this browser"). */
export const isLive = USE_SUPABASE_AUTH;
