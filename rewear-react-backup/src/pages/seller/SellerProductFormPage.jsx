import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductForm from '@/components/product/ProductForm';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { categoryService, productService } from '@/services';

export default function SellerProductFormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { data, loading, error } = useAsync(async () => Promise.all([
    categoryService.listCategories(), productService.listSellerProducts(user.id),
  ]), [user.id]);

  if (loading) return <section className="container-page py-12 text-brown">Loading listing form…</section>;
  if (error) return <section className="container-page py-12"><EmptyState title="The listing form could not be opened" description="Please refresh and try again." /></section>;
  const categories = data[0];
  const product = id ? data[1].find((item) => item.id === id) : null;
  if (id && !product) return <section className="container-page py-12"><EmptyState as="h1" title="Listing not found" description="This piece is not in your seller studio." action={<Button to={ROUTES.seller.products}>Back to listings</Button>} /></section>;

  const submit = async (values, intent) => {
    setSaving(true);
    setSaveError('');
    try {
      await productService.saveSellerProduct(values, user.id, intent, id);
      toast.success(intent === 'submit' ? 'Your piece is in the curator review queue.' : 'Your draft has been saved in this browser.', { title: intent === 'submit' ? 'Submitted for review' : 'Draft saved' });
      navigate(ROUTES.seller.products, { replace: true });
    } catch (e) {
      setSaveError(e.message || 'Could not save this listing. Please try again.');
      setSaving(false);
    }
  };

  return (
    <section className="container-page py-8 md:py-12" aria-labelledby="product-form-title">
      <p className="text-meta uppercase tracking-[0.16em]">Seller studio</p>
      <h1 id="product-form-title" className="display-md mt-2">{product ? 'Edit your piece' : 'List a piece'}</h1>
      <p className="mt-3 max-w-2xl text-brown">Good listings make it easier for the right person to find your piece. Include clear photos, measurements and any signs of wear.</p>
      <div className="mt-8 border-t border-beige pt-8">
        {saveError && <p role="alert" className="mb-6 border-l-2 border-brick bg-brick/5 p-3 text-sm text-brick">{saveError}</p>}
        <ProductForm
          initialValues={product ? { ...product, style: product.styles?.[0] ?? '' } : undefined}
          status={product?.status}
          rejectionReason={product?.rejectionReason}
          categories={categories}
          submitting={saving}
          onSubmit={submit}
          onCancel={() => navigate(ROUTES.seller.products)}
        />
      </div>
      <p className="mt-5 text-xs leading-relaxed text-brown">Demo uploads are saved in this browser. They are not published to a live store.</p>
    </section>
  );
}
