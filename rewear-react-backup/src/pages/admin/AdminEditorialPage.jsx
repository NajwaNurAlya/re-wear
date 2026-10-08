import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import ImagePlaceholder from '@/components/ui/ImagePlaceholder';
import Select from '@/components/ui/Select';
import StatusBadge from '@/components/ui/StatusBadge';
import { ARTICLE_STATUS } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/format';
import { editorialService } from '@/services';
import { EDITORIAL_TOPICS } from '@/components/editorial/EditorialForm';

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: ARTICLE_STATUS.DRAFT, label: 'Draft' },
  { value: ARTICLE_STATUS.PUBLISHED, label: 'Published' },
  { value: ARTICLE_STATUS.ARCHIVED, label: 'Archived' },
];

function ActionButtons({ article, onChanged }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const run = async () => {
    setSaving(true);
    try {
      if (confirm === 'publish') await editorialService.publishArticle(article.id);
      if (confirm === 'unpublish') await editorialService.unpublishArticle(article.id);
      if (confirm === 'archive') await editorialService.archiveArticle(article.id);
      toast.success('Editorial status updated.', { title: 'Editorial' });
      setConfirm(null);
      onChanged();
    } catch (error) {
      toast.error(error.message || 'The article could not be updated.', { title: 'Editorial not updated' });
    } finally {
      setSaving(false);
    }
  };

  const dialog = {
    publish: ['Publish this article?', 'Published articles appear on the public Editorial pages.', 'Publish'],
    unpublish: ['Unpublish this article?', 'It will move back to draft and disappear from public Editorial.', 'Unpublish'],
    archive: ['Archive this article?', 'Archived articles are hidden from public Editorial and remain in admin history.', 'Archive'],
  }[confirm];

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button to={ROUTES.admin.editEditorial(article.id)} size="sm" variant="secondary">Edit</Button>
      {article.status !== ARTICLE_STATUS.PUBLISHED && article.status !== ARTICLE_STATUS.ARCHIVED && (
        <Button size="sm" variant="secondary" onClick={() => setConfirm('publish')}>Publish</Button>
      )}
      {article.status === ARTICLE_STATUS.PUBLISHED && (
        <Button size="sm" variant="secondary" onClick={() => setConfirm('unpublish')}>Unpublish</Button>
      )}
      {article.status !== ARTICLE_STATUS.ARCHIVED && (
        <Button size="sm" variant="danger-outline" onClick={() => setConfirm('archive')}>Archive</Button>
      )}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={dialog?.[0]}
        description={dialog?.[1]}
        confirmLabel={dialog?.[2]}
        tone={confirm === 'archive' ? 'danger' : 'default'}
        loading={saving}
        onConfirm={run}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

export default function AdminEditorialPage() {
  const [status, setStatus] = useState('');
  const [topic, setTopic] = useState('');
  const { data, loading, error, reload } = useAsync(() => editorialService.listAllArticles(), []);
  const articles = data ?? [];

  const rows = useMemo(() => articles.filter((article) =>
    (!status || article.status === status) &&
    (!topic || article.topic === topic)
  ), [articles, status, topic]);

  const columns = [
    { key: 'cover', header: 'Cover', render: (article) => (
      <div className="h-16 w-24 overflow-hidden bg-beige">
        {article.cover ? <img src={article.cover} alt="" className="size-full object-cover" /> : <ImagePlaceholder />}
      </div>
    ) },
    { key: 'title', header: 'Title', sortable: true, render: (article) => (
      <>
        <span className="font-medium">{article.title}</span>
        <span className="block text-meta">{article.excerpt || 'No excerpt'}</span>
      </>
    ) },
    { key: 'topic', header: 'Category', sortable: true },
    { key: 'author', header: 'Author', sortable: true },
    { key: 'status', header: 'Status', sortable: true, render: (article) => <StatusBadge type="article" status={article.status} /> },
    { key: 'publishedAt', header: 'Published', sortable: true, render: (article) => article.status === ARTICLE_STATUS.PUBLISHED ? formatDate(article.publishedAt) : '—' },
    { key: 'action', header: 'Action', render: (article) => <ActionButtons article={article} onChanged={reload} /> },
  ];

  return (
    <section className="container-page py-8 md:py-12" aria-labelledby="admin-editorial-title">
      <p className="text-meta uppercase tracking-[0.16em]">Curator desk</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="admin-editorial-title" className="display-md">Editorial</h1>
          <p className="mt-3 max-w-2xl text-brown">Manage guides, stories, care notes, seller profiles and style edits.</p>
        </div>
        <Button to={ROUTES.admin.newEditorial}>New Article</Button>
      </div>

      <div className="mt-8 grid gap-3 border-t border-beige pt-5 sm:grid-cols-2 lg:max-w-xl">
        <Select label="Status" options={STATUS_FILTERS} value={status} onChange={(event) => setStatus(event.target.value)} />
        <Select
          label="Category"
          options={[{ value: '', label: 'All categories' }, ...EDITORIAL_TOPICS.map((item) => ({ value: item, label: item }))]}
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        />
      </div>

      <div className="mt-5">
        {error ? (
          <EmptyState title="Editorial could not be loaded" description="Please try again." action={<Button variant="secondary" onClick={reload}>Retry</Button>} />
        ) : (
          <DataTable
            caption="Editorial articles"
            columns={columns}
            rows={rows}
            loading={loading}
            empty={<EmptyState compact title="No articles in this view" description="Try another filter or create a new article." action={<Button to={ROUTES.admin.newEditorial}>New Article</Button>} />}
          />
        )}
      </div>
      <p className="mt-5 text-xs text-brown">Public Editorial only shows published articles. Drafts and archived articles stay in this admin view.</p>
    </section>
  );
}
