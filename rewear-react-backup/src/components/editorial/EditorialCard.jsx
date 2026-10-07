import { Link } from 'react-router-dom';
import ImagePlaceholder from '@/components/ui/ImagePlaceholder';
import { ROUTES } from '@/constants/routes';
import { cx } from '@/lib/cx';
import { formatDate } from '@/lib/format';

/**
 * Article summary shape (from editorialService.listArticles):
 * { slug, title, topic?, author, publishedAt?, excerpt, cover }
 *
 * Variants
 *   feature  wide, image left and text right (top of the editorial index)
 *   lead     large image above the text (homepage lead story)
 *   default  standard grid card
 *   row      small thumbnail beside the text (homepage side stories)
 *
 * Like ProductCard, the whole card is one link (the title, stretched), so there are no nested links.
 */
const LAYOUT = {
  feature: {
    root: 'grid gap-6 md:grid-cols-12 md:items-center md:gap-10',
    media: 'aspect-[3/2] md:col-span-7',
    body: 'md:col-span-5',
    title: 'display-md',
    excerpt: true,
  },
  lead: { root: 'flex flex-col', media: 'aspect-[4/3]', body: 'mt-5', title: 'display-md', excerpt: true },
  default: { root: 'flex flex-col', media: 'aspect-[3/2]', body: 'mt-4', title: 'title', excerpt: true },
  row: {
    root: 'grid grid-cols-[6.5rem_1fr] gap-4 sm:grid-cols-[9rem_1fr] sm:gap-5',
    media: 'aspect-[4/5]',
    body: '',
    title: 'title',
    excerpt: false,
  },
};

export default function EditorialCard({ article, variant = 'default', as: Heading = 'h3', className }) {
  const { slug, title, topic, author, publishedAt, excerpt, cover } = article;
  const v = LAYOUT[variant] ?? LAYOUT.default;

  return (
    <article
      className={cx(
        'group relative outline-dark-brown has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4',
        v.root,
        className
      )}
    >
      <div className={cx('overflow-hidden bg-beige', v.media)}>
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 ease-soft group-hover:scale-[1.02]"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      <div className={v.body}>
        {topic && <p className="font-serif text-sm text-brown italic">{topic}</p>}
        <Heading className={cx(v.title, topic && 'mt-1')}>
          <Link
            to={ROUTES.editorialDetail(slug)}
            className="underline-offset-4 decoration-transparent group-hover:underline group-hover:decoration-dark-brown after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {title}
          </Link>
        </Heading>
        {v.excerpt && excerpt && <p className="mt-3 line-clamp-3 text-brown">{excerpt}</p>}
        <p className="mt-3 flex flex-wrap gap-x-4 text-meta">
          <span>By {author}</span>
          {publishedAt && <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>}
        </p>
      </div>
    </article>
  );
}

export function EditorialCardSkeleton({ variant = 'default' }) {
  const v = LAYOUT[variant] ?? LAYOUT.default;
  return (
    <div aria-hidden="true" className={v.root}>
      <div className={cx('animate-pulse bg-beige', v.media)} />
      <div className={cx('space-y-3', v.body || 'mt-1')}>
        <div className="h-3 w-1/4 animate-pulse bg-beige" />
        <div className="h-6 w-4/5 animate-pulse bg-beige" />
        {v.excerpt && <div className="h-12 w-full animate-pulse bg-beige" />}
      </div>
    </div>
  );
}
