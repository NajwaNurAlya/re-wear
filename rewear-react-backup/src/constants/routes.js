// Every path in the app lives here. Param builders default to the ':param' token,
// so ROUTES.product() gives the route pattern and ROUTES.product(12) gives a link.

export const ROUTES = {
  home: '/',
  explore: '/explore',
  // Link to Explore with filters pre-applied: ROUTES.exploreWith({ style: 'Vintage' }) -> /explore?style=Vintage
  // The Explore page reads these params in Step 6 (keys match lib/filters.js).
  exploreWith: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
    return qs ? `/explore?${qs}` : '/explore';
  },
  product: (id = ':id') => `/product/${id}`,
  editorial: '/editorial',
  editorialDetail: (slug = ':slug') => `/editorial/${slug}`,
  login: '/login',
  register: '/register',
  unauthorized: '/unauthorized',

  profile: '/profile',
  wishlist: '/wishlist',
  cart: '/cart',
  checkout: '/checkout',
  orderConfirmation: (id = ':id') => `/order-confirmation/${id}`,
  orders: '/orders',
  order: (id = ':id') => `/orders/${id}`,

  seller: {
    base: '/seller', // bare /seller redirects to root
    root: '/seller/dashboard',
    products: '/seller/products',
    newProduct: '/seller/products/new',
    editProduct: (id = ':id') => `/seller/products/${id}/edit`,
    orders: '/seller/orders',
  },

  admin: {
    base: '/admin', // bare /admin redirects to root
    root: '/admin/dashboard',
    products: '/admin/products',
    curation: '/admin/curation',
    users: '/admin/users',
    categories: '/admin/categories',
    orders: '/admin/orders',
  },

  // Development only (not registered in production builds). Removed before launch.
  dev: {
    components: '/dev/components',
    routes: '/dev/routes',
  },
};
