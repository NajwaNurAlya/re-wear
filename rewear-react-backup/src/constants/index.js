// Single source of truth for enums used across UI, mock data and (later) Supabase.
// Values match the database enums exactly.

export const ROLES = { BUYER: 'buyer', SELLER: 'seller', ADMIN: 'admin' };

// Roles a visitor may choose at public registration. Admin is NEVER listed here:
// it is seeded separately (see supabase/seed.sql in Step 12).
export const REGISTRABLE_ROLES = [ROLES.BUYER, ROLES.SELLER];

export const PRODUCT_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SOLD: 'sold',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const ARTICLE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

// Happy-path order used by the OrderTimeline (cancelled is shown separately).
export const ORDER_FLOW = ['pending', 'paid', 'processing', 'shipped', 'completed'];

export const CONDITIONS = [
  { value: 'like_new', label: 'Like New' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

export const STYLES = ['Vintage', 'Y2K', 'Minimalist', 'Streetwear', 'Preppy', 'Workwear', 'Grunge', 'Casual'];
export const ERAS = ['70s', '80s', '90s', '2000s', 'Contemporary'];
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'One Size'];

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'e_wallet', label: 'E-Wallet' },
  { value: 'cod', label: 'Cash on Delivery' },
];

export const labelOf = (list, value) => list.find((i) => i.value === value)?.label ?? value;
