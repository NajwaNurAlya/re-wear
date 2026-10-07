import { EditorialCard, EditorialCardSkeleton } from '@/components/editorial';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { editorialService } from '@/services';

export default function EditorialListPage() {
  useDocumentTitle('Editorial');
  const { data, loading, error, reload } = useAsync(() => editorialService.listArticles(), []);
  const [lead, ...rest] = data ?? [];

  return (
    <div className="container-page py-12 md:py-20">
      <header className="max-w-2xl">
        <h1 className="display-lg">Editorial</h1>
        <p className="mt-5 text-lg text-brown">
          Guides, seller profiles and notes on looking after clothes that have already lived a little.
        </p>
      </header>

      <div className="mt-12 border-t border-dark-brown pt-10 md:mt-16 md:pt-14">
        {error ? (
          <EmptyState
            title="The stories could not be loaded"
            description="Check your connection and try again."
            action={<Button variant="secondary" onClick={reload}>Try again</Button>}
          />
        ) : loading ? (
          <div className="space-y-14">
            <EditorialCardSkeleton variant="feature" />
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
              <EditorialCardSkeleton />
              <EditorialCardSkeleton />
            </div>
            <p className="sr-only" role="status">Loading stories</p>
          </div>
        ) : !lead ? (
          <EmptyState title="No stories yet" description="New guides and seller profiles are on the way." />
        ) : (
          <>
            <EditorialCard article={lead} variant="feature" as="h2" />
            {rest.length > 0 && (
              <ul role="list" className="mt-14 grid gap-x-8 gap-y-14 border-t border-beige pt-12 sm:grid-cols-2 md:mt-20 md:pt-16">
                {rest.map((a) => (
                  <li key={a.slug}><EditorialCard article={a} as="h2" /></li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
