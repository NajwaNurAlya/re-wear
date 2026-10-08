import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EditorialForm from '@/components/editorial/EditorialForm';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import { ARTICLE_STATUS } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/hooks/useToast';
import { editorialService, productService } from '@/services';

export default function AdminEditorialFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { data, loading, error } = useAsync(async () => {
    const [article, products] = await Promise.all([
      id ? editorialService.getArticleForAdmin(id) : Promise.resolve(null),
      productService.listProducts({ includeSold: true }),
    ]);
    return { article, products };
  }, [id]);

  if (loading) {
    return (
      <section className="container-page flex min-h-[50vh] items-center justify-center py-12">
        <Spinner showLabel label="Loading editorial form" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="container-page py-12">
        <EmptyState title="The editorial form could not be opened" description="Please refresh and try again." action={<Button to={ROUTES.admin.editorial}>Back to editorial</Button>} />
      </section>
    );
  }

  if (id && !data.article) {
    return (
      <section className="container-page py-12">
        <EmptyState as="h1" title="Article not found" description="It may have been archived elsewhere or the link is incorrect." action={<Button to={ROUTES.admin.editorial}>Back to editorial</Button>} />
      </section>
    );
  }

  const submit = async (values, intent) => {
    setSaving(true);
    setSaveError('');
    try {
      const publish = intent === 'publish' || values.status === ARTICLE_STATUS.PUBLISHED;
      if (id) await editorialService.updateArticle(id, values, { publish });
      else await editorialService.createArticle(values, { publish });
      toast.success(publish ? 'Article published.' : 'Article saved.', { title: 'Editorial' });
      navigate(ROUTES.admin.editorial, { replace: true });
    } catch (err) {
      const message = err.message || 'The article could not be saved. Please try again.';
      setSaveError(message);
      toast.error(message, { title: 'Editorial not saved' });
      setSaving(false);
    }
  };

  return (
    <section className="container-page py-8 md:py-12" aria-labelledby="editorial-form-title">
      <p className="text-meta uppercase tracking-[0.16em]">Curator desk</p>
      <h1 id="editorial-form-title" className="display-md mt-2">{id ? 'Edit article' : 'New article'}</h1>
      <p className="mt-3 max-w-2xl text-brown">Draft, publish and connect stories to the pieces they reference.</p>
      {saveError && <p role="alert" className="mt-6 border-l-2 border-brick bg-brick/5 p-3 text-sm text-brick">{saveError}</p>}
      <div className="mt-8">
        <EditorialForm
          initialValues={data.article}
          products={data.products}
          submitting={saving}
          onSubmit={submit}
          onCancel={() => navigate(ROUTES.admin.editorial)}
        />
      </div>
    </section>
  );
}
