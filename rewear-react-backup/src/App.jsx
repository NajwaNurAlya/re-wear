import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ROLES } from '@/constants';
import { ROUTES } from '@/constants/routes';

import ProtectedRoute from '@/components/common/ProtectedRoute';
import ScrollToTop from '@/components/common/ScrollToTop';
import PublicLayout from '@/components/layout/PublicLayout';
import DashboardLayout from '@/components/layout/DashboardLayout';

import HomePage from '@/pages/public/HomePage';
import ExplorePage from '@/pages/public/ExplorePage';
import ProductDetailPage from '@/pages/public/ProductDetailPage';
import EditorialListPage from '@/pages/public/EditorialListPage';
import EditorialDetailPage from '@/pages/public/EditorialDetailPage';
import UnauthorizedPage from '@/pages/public/UnauthorizedPage';
import NotFoundPage from '@/pages/public/NotFoundPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';

import ProfilePage from '@/pages/user/ProfilePage';
import WishlistPage from '@/pages/user/WishlistPage';
import CartPage from '@/pages/user/CartPage';
import CheckoutPage from '@/pages/user/CheckoutPage';
import OrderConfirmationPage from '@/pages/user/OrderConfirmationPage';
import OrdersPage from '@/pages/user/OrdersPage';
import OrderDetailPage from '@/pages/user/OrderDetailPage';

import SellerDashboardPage from '@/pages/seller/SellerDashboardPage';
import SellerProductsPage from '@/pages/seller/SellerProductsPage';
import SellerProductFormPage from '@/pages/seller/SellerProductFormPage';
import SellerOrdersPage from '@/pages/seller/SellerOrdersPage';

import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminProductsPage from '@/pages/admin/AdminProductsPage';
import AdminCurationPage from '@/pages/admin/AdminCurationPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage';
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage';
import AdminEditorialPage from '@/pages/admin/AdminEditorialPage';
import AdminEditorialFormPage from '@/pages/admin/AdminEditorialFormPage';

// Dev-only component gallery. `import.meta.env.DEV` is false in production builds,
// so this import is removed from the bundle entirely.
const ComponentGalleryPage = import.meta.env.DEV ? lazy(() => import('@/pages/dev/ComponentGalleryPage')) : null;
const RouteDirectoryPage = import.meta.env.DEV ? lazy(() => import('@/pages/dev/RouteDirectoryPage')) : null;

const { BUYER, SELLER, ADMIN } = ROLES;

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Storefront layout: public pages + shopping pages */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path={ROUTES.explore} element={<ExplorePage />} />
          <Route path={ROUTES.product()} element={<ProductDetailPage />} />
          <Route path={ROUTES.editorial} element={<EditorialListPage />} />
          <Route path={ROUTES.editorialDetail()} element={<EditorialDetailPage />} />
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.unauthorized} element={<UnauthorizedPage />} />
          {RouteDirectoryPage && (
            <Route
              path={ROUTES.dev.routes}
              element={<Suspense fallback={null}><RouteDirectoryPage /></Suspense>}
            />
          )}
          {ComponentGalleryPage && (
            <Route
              path={ROUTES.dev.components}
              element={<Suspense fallback={null}><ComponentGalleryPage /></Suspense>}
            />
          )}

          {/* Any signed-in user, including admin */}
          <Route element={<ProtectedRoute />}>
            <Route path={ROUTES.profile} element={<ProfilePage />} />
          </Route>

          {/* Shopping: buyers and sellers (admin has no cart) */}
          <Route element={<ProtectedRoute roles={[BUYER, SELLER]} />}>
            <Route path={ROUTES.wishlist} element={<WishlistPage />} />
            <Route path={ROUTES.cart} element={<CartPage />} />
            <Route path={ROUTES.checkout} element={<CheckoutPage />} />
            <Route path={ROUTES.orderConfirmation()} element={<OrderConfirmationPage />} />
            <Route path={ROUTES.orders} element={<OrdersPage />} />
            <Route path={ROUTES.order()} element={<OrderDetailPage />} />
          </Route>
        </Route>

        {/* Seller dashboard */}
        <Route element={<ProtectedRoute roles={[SELLER]} />}>
          <Route path={ROUTES.seller.base} element={<Navigate to={ROUTES.seller.root} replace />} />
          <Route element={<DashboardLayout area="seller" />}>
            <Route path={ROUTES.seller.root} element={<SellerDashboardPage />} />
            <Route path={ROUTES.seller.products} element={<SellerProductsPage />} />
            <Route path={ROUTES.seller.newProduct} element={<SellerProductFormPage />} />
            <Route path={ROUTES.seller.editProduct()} element={<SellerProductFormPage />} />
            <Route path={ROUTES.seller.orders} element={<SellerOrdersPage />} />
          </Route>
        </Route>

        {/* Admin dashboard */}
        <Route element={<ProtectedRoute roles={[ADMIN]} />}>
          <Route path={ROUTES.admin.base} element={<Navigate to={ROUTES.admin.root} replace />} />
          <Route element={<DashboardLayout area="admin" />}>
            <Route path={ROUTES.admin.root} element={<AdminDashboardPage />} />
            <Route path={ROUTES.admin.products} element={<AdminProductsPage />} />
            <Route path={ROUTES.admin.editorial} element={<AdminEditorialPage />} />
            <Route path={ROUTES.admin.newEditorial} element={<AdminEditorialFormPage />} />
            <Route path={ROUTES.admin.editEditorial()} element={<AdminEditorialFormPage />} />
            <Route path={ROUTES.admin.curation} element={<AdminCurationPage />} />
            <Route path={ROUTES.admin.users} element={<AdminUsersPage />} />
            <Route path={ROUTES.admin.categories} element={<AdminCategoriesPage />} />
            <Route path={ROUTES.admin.orders} element={<AdminOrdersPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
