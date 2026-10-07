import { Link, useParams } from 'react-router-dom';
import { EditorialCard } from '@/components/editorial';
import ProductGrid from '@/components/product/ProductGrid';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import { ChevronIcon } from '@/components/ui/icons';
import { ROUTES } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDate } from '@/lib/format';
import { editorialService, productService } from '@/services';

function BackLink({ className }) {
  return (
    <Link to={ROUTES.editorial} className={`link-underline inline-flex items-center gap-1 py-2 text-sm font-medium ${className ?? ''}`}>
      <ChevronIcon direction="left" size={16} />
      Back to editorial
    </Link>
  );
}

// One block of article body. The service returns blocks so the page controls all typography.
function Block({ block }) {
  if (block.type === 'h2') return <h2 className="mt-14 text-2xl md:text-3xl">{block.text}</h2>;
  if (block.type === 'quote') {
    return (
      <blockquote className="my-12 border-l border-dark-brown pl-6 font-serif text-2xl leading-snug italic md:text-[1.75rem]">
        {block.text}
      </blockquote>
    );
  }
  return <p className="mt-6 text-lg first:mt-0">{block.text}</p>;
}

export default function EditorialDetailPage() {
  const { slug } = useParams();
  const article = useAsync(() => editorialService.getArticle(slug), [slug]);
  const more = useAsync(() => editorialService.listArticles({ excludeSlug: slug, limit: 2 }), [slug]);
  const related = useAsync(
    () => (article.data?.relatedProductIds?.length ? productService.listProducts({ ids: article.data.relatedProductIds }) : []),
    [article.data]
  );

  const a = article.data;
  useDocumentTitle(a?.title ?? (article.loading ? '' : 'Story not found'));

  if (article.loading) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center py-20">
        <Spinner showLabel label="Loading story" />
      </div>
    );
  }

  if (article.error || !a) {
    return (
      <div className="container-page py-12 md:py-20">
        <BackLink />
        <EmptyState
          as="h1"
          title={article.error ? 'This story could not be loaded' : 'We could not find that story'}
          description={
            article.error
              ? 'Check your connection and try again.'
              : 'It may have been moved or the link may be mistyped. The rest of the editorial is still here.'
          }
          action={
            article.error ? (
              <Button variant="secondary" onClick={article.reload}>Try again</Button>
            ) : (
              <Button to={ROUTES.editorial}>Back to editorial</Button>
            )
          }
        />
      </div>
    );
  }

  return (
    <article className="container-page py-8 md:py-14">
      <BackLink />

      <header className="mt-6 max-w-4xl md:mt-10">
        {a.topic && <p className="font-serif text-lg text-brown italic">{a.topic}</p>}
        <h1 className="display-lg mt-2">{a.title}</h1>
        <p className="mt-6 max-w-2xl font-serif text-xl leading-relaxed text-brown italic md:text-2xl">{a.excerpt}</p>
        <p className="mt-8 flex flex-wrap gap-x-8 gap-y-1 border-t border-beige pt-4 text-sm">
          <span>By <span className="font-medium">{a.author}</span></span>
          {a.publishedAt && <time dateTime={a.publishedAt} className="text-brown">{formatDate(a.publishedAt)}</time>}
        </p>
      </header>

      <figure className="mt-8 md:mt-12">
        <div className="aspect-[3/2] overflow-hidden bg-beige md:aspect-[2/1]">
          <img src={a.cover} alt="" decoding="async" fetchPriority="high" className="size-full object-cover" />
        </div>
      </figure>

      <div className="prose-serif mx-auto mt-12 max-w-[40rem] md:mt-16">
        {a.body.map((block, i) => <Block key={i} block={block} />)}
        <div className="mt-14 border-t border-beige pt-6">
          <BackLink />
        </div>
      </div>

      {related.data?.length > 0 && (
        <section aria-labelledby="related-title" className="mt-20 border-t border-dark-brown pt-6 md:mt-28">
          <h2 id="related-title" className="display-md">Pieces from this story</h2>
          <div className="mt-8 md:mt-10">
            <ProductGrid columns="quad" products={related.data} skeletonCount={4} />
          </div>
        </section>
      )}

      {more.data?.length > 0 && (
        <section aria-labelledby="more-title" className="mt-20 border-t border-dark-brown pt-6 md:mt-28">
          <h2 id="more-title" className="display-md">More from the editorial</h2>
          <ul role="list" className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 md:mt-10">
            {more.data.map((s) => (
              <li key={s.slug}><EditorialCard article={s} as="h3" /></li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
