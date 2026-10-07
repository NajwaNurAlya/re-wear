import SectionHeader from '@/components/common/SectionHeader';
import { EditorialCard, EditorialCardSkeleton } from '@/components/editorial';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { ROUTES } from '@/constants/routes';

export default function EditorialSection({ articles = [], loading, error, onRetry }) {
  const [lead, ...rest] = articles;

  return (
    <section aria-labelledby="editorial-title" className="container-page py-16 md:py-24">
      <SectionHeader
        id="editorial-title"
        title="From the editorial"
        description="Guides, seller profiles and notes on looking after clothes that have already lived a little."
        action={{ label: 'Read all stories', to: ROUTES.editorial }}
      />

      <div className="mt-10 md:mt-12">
        {error ? (
          <EmptyState
            compact
            title="The stories could not be loaded"
            description="Check your connection and try again."
            action={<Button variant="secondary" onClick={onRetry}>Try again</Button>}
          />
        ) : loading ? (
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7"><EditorialCardSkeleton variant="lead" /></div>
            <div className="space-y-10 lg:col-span-5">
              <EditorialCardSkeleton variant="row" />
              <EditorialCardSkeleton variant="row" />
            </div>
            <p className="sr-only" role="status">Loading stories</p>
          </div>
        ) : !lead ? (
          <EmptyState compact title="No stories yet" description="New guides and seller profiles are on the way." />
        ) : (
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <EditorialCard article={lead} variant="lead" />
            </div>
            {rest.length > 0 && (
              <ul role="list" className="space-y-8 lg:col-span-5 lg:space-y-0 lg:divide-y lg:divide-beige">
                {rest.map((a) => (
                  <li key={a.slug} className="lg:py-6 lg:first:pt-0 lg:last:pb-0">
                    <EditorialCard article={a} variant="row" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
