import { Link } from 'react-router-dom';
import SectionHeader from '@/components/common/SectionHeader';
import { ERAS, STYLES } from '@/constants';
import { ROUTES } from '@/constants/routes';

// Hang-tag link. `!` forces the hover colours over the tag-label utility's own border and text colours.
const tagLink =
  'tag-label min-h-9! px-3! transition-colors hover:border-dark-brown! hover:text-dark-brown! hover:bg-beige/60';

function CategoryRows({ categories, loading }) {
  if (loading) {
    return (
      <ul aria-hidden="true" className="border-t border-beige">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="border-b border-beige py-5"><div className="h-7 w-1/2 animate-pulse bg-beige" /></li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="border-t border-beige">
      {categories.map((c) => (
        <li key={c.id} className="border-b border-beige">
          <Link
            to={ROUTES.exploreWith({ category: c.id })}
            className="group flex items-baseline justify-between gap-4 py-4 transition-colors hover:bg-beige/40 md:py-5"
          >
            <span className="font-serif text-2xl transition-transform duration-200 ease-soft group-hover:translate-x-1 md:text-3xl">
              {c.name}
            </span>
            <span className="text-meta">{c.productCount} {c.productCount === 1 ? 'piece' : 'pieces'}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TagGroup({ title, children }) {
  return (
    <div>
      <h3 className="title">{title}</h3>
      <ul role="list" className="mt-4 flex flex-wrap gap-2">{children}</ul>
    </div>
  );
}

export default function CategorySection({ categories = [], loading }) {
  return (
    <section aria-labelledby="browse-title" className="container-page pb-16 md:pb-24">
      <SectionHeader
        id="browse-title"
        title="Browse the rack"
        description="Start with what you want to wear, or with the decade you keep coming back to."
      />

      <div className="mt-10 grid gap-12 md:mt-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <h3 className="sr-only">Categories</h3>
          <CategoryRows categories={categories} loading={loading} />
        </div>

        <div className="space-y-10 lg:col-span-5 lg:col-start-8">
          <TagGroup title="By style">
            {STYLES.map((s) => (
              <li key={s}><Link to={ROUTES.exploreWith({ style: s })} className={tagLink}>{s}</Link></li>
            ))}
          </TagGroup>
          <TagGroup title="By era">
            {ERAS.map((e) => (
              <li key={e}><Link to={ROUTES.exploreWith({ era: e })} className={tagLink}>{e}</Link></li>
            ))}
          </TagGroup>
        </div>
      </div>
    </section>
  );
}
