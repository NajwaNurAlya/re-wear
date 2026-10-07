import { Outlet } from 'react-router-dom';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';

// Storefront shell. The navbar badges read the cart and wishlist contexts.
export default function PublicLayout() {
  const cart = useCart();
  const wishlist = useWishlist();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar cartCount={cart.count} wishlistCount={wishlist.count} />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
