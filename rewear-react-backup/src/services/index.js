// Single entry point for data access. Pages and hooks import from '@/services' only,
// never from a specific adapter, so switching data sources touches this file alone.
//
//   VITE_DATA_SOURCE=mock       seed data in services/mock (default)
//   VITE_DATA_SOURCE=supabase   adapter arrives in Step 12 (services/supabase)
import * as mockAuth from './mock/authService';
import * as mockProducts from './mock/productService';
import * as mockCategories from './mock/categoryService';
import * as mockEditorial from './mock/editorialService';
import * as mockOrders from './mock/orderService';

const SOURCE = import.meta.env.VITE_DATA_SOURCE ?? 'mock';

if (SOURCE !== 'mock' && import.meta.env.DEV) {
  console.warn(`VITE_DATA_SOURCE="${SOURCE}" has no adapter yet. Falling back to mock data until Step 12.`);
}

export const authService = mockAuth;
export const productService = mockProducts;
export const categoryService = mockCategories;
export const editorialService = mockEditorial;
export const orderService = mockOrders;
