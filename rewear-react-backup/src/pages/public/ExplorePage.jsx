import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import SearchBar from '@/components/ui/SearchBar';
import Select from '@/components/ui/Select';
import FilterPanel from '@/components/product/FilterPanel';
import ProductGrid from '@/components/product/ProductGrid';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  EMPTY_FILTERS,
  SORT_OPTIONS,
  buildExploreParams,
  countActiveFilters,
  parseExploreParams,
  resolveCategoryId,
} from '@/lib/filters';
import { categoryService, productService } from '@/services';

const SEARCH_DEBOUNCE_MS = 250;

// Catalog. The URL is the single source of truth for search, filters and sorting, so every
// state is shareable and back/forward just works:
//   /explore?q=denim&category=cat-outerwear&style=Vintage&era=90s&size=M&condition=excellent&sort=price-asc
export default function ExplorePage() {
  useDocumentTitle('Explore');
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseExploreParams(params), [params]);

  const categories = useAsync(() => categoryService.listCategories(), []);
  const categoryList = categories.data ?? [];
  const categoriesReady = categories.data !== null || categories.error !== null;

  // ?category= accepts an id, a slug or a name; the panel always works with the id.
  const filters = useMemo(
    () => ({ ...state.filters, category: resolveCategoryId(state.filters.category, categoryList) }),
    [state.filters, categoryList]
  );
  const unknownCategory =
    filters.category && categoriesReady && !categoryList.some((c) => c.id === filters.category) ? state.filters.category : '';

  // Merge a change into the current URL (functional form, so quick successive edits never use stale state).
  const update = (patch) =>
    setParams(
      (prev) => {
        const current = parseExploreParams(prev);
        return buildExploreParams({
          q: patch.q ?? current.q,
          sort: patch.sort ?? current.sort,
          filters: patch.filters ?? current.filters,
        });
      },
      { replace: true }
    );

  /* ------------------------------------------------------------------ search */
  const [text, setText] = useState(state.q);

  // Typing updates the URL after a short pause; Enter or the clear button apply it at once.
  useEffect(() => {
    if (text.trim() === state.q) return undefined;
    const timer = setTimeout(() => update({ q: text.trim() }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `update` only closes over setParams, which is stable enough for this debounce.
  }, [text, state.q]); // eslint-disable-line react-hooks/exhaustive-deps

  // Someone else changed ?q= (navbar search, back button): mirror it into the box, but never fight the typist.
  useEffect(() => {
    setText((current) => (current.trim() === state.q ? current : state.q));
  }, [state.q]);

  /* ---------------------------------------------------------------- products */
  const query = {
    search: state.q,
    categoryId: filters.category || undefined,
    sizes: filters.sizes,
    conditions: filters.conditions,
    styles: filters.styles,
    eras: filters.eras,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    sort: state.sort,
  };
  // Wait for the category list first so a slug in the URL is resolved before the first fetch.
  const products = useAsync(
    async () => (categoriesReady ? productService.listProducts(query) : null),
    [categoriesReady, JSON.stringify(query)]
  );

  // Keep showing the previous results while a new query loads, so the grid does not flash skeletons on every keystroke.
  const lastResults = useRef(null);
  if (products.data) lastResults.current = products.data;
  const results = products.data ?? lastResults.current;
  const firstLoad = results === null && !products.error;
  const refreshing = products.loading && results !== null;

  /* ----------------------------------------------------------------- actions */
  const activeFilters = countActiveFilters(filters);
  const hasConstraints = activeFilters > 0 || state.q !== '';
  const resetFilters = () => update({ filters: EMPTY_FILTERS });
  const resetAll = () => {
    setText('');
    setParams(buildExploreParams(), { replace: true });
  };

  const count = results?.length ?? 0;

  const empty = (
    <EmptyState
      title="No pieces match"
      description={
        unknownCategory
          ? `There is no category called “${unknownCategory}”. Reset the filters to browse everything.`
          : hasConstraints
            ? 'Nothing matches that search and filter combination. Try removing a filter or searching for something else.'
            : 'There are no pieces on the rack right now. Check back soon.'
      }
      action={hasConstraints && <Button variant="secondary" onClick={resetAll}>Reset search &amp; filters</Button>}
    />
  );

  return (
    <section aria-labelledby="explore-title" className="container-page py-10 md:py-16">
      <header>
        <p className="text-meta">The collection</p>
        <h1 id="explore-title" className="display-lg mt-3">Explore</h1>
      </header>

      <div className="mt-8 grid gap-4 border-t border-dark-brown pt-5 sm:grid-cols-[1fr_14rem] sm:items-end">
        <SearchBar
          value={text}
          onChange={setText}
          onSubmit={(q) => update({ q })}
          onClear={() => update({ q: '' })}
          placeholder="Search by name or description"
        />
        <Select
          label="Sort by"
          value={state.sort}
          onChange={(e) => update({ sort: e.target.value })}
          options={SORT_OPTIONS}
          wrapperClassName="sm:[&>label]:sr-only"
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-12">
        <FilterPanel
          className="lg:sticky lg:top-24 lg:self-start"
          filters={filters}
          onChange={(next) => update({ filters: next })}
          onReset={resetFilters}
          categories={categoryList.map((c) => ({ value: c.id, label: c.name }))}
        />

        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <p role="status" aria-live="polite" className="text-sm text-brown">
              {firstLoad ? 'Loading pieces…' : products.error ? '' : `${count} ${count === 1 ? 'piece' : 'pieces'} found`}
              {state.q && !firstLoad && !products.error && <> for “{state.q}”</>}
            </p>
            {hasConstraints && (
              <button type="button" onClick={resetAll} className="link-underline text-sm">
                Reset search &amp; filters
              </button>
            )}
          </div>

          {products.error ? (
            <EmptyState
              title="We could not load the pieces"
              description="Something went wrong on our side. Please try again."
              action={<Button variant="secondary" onClick={products.reload}>Try again</Button>}
            />
          ) : (
            <div className={refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={refreshing || undefined}>
              <ProductGrid
                products={results ?? []}
                loading={firstLoad}
                skeletonCount={6}
                columns="withSidebar"
                empty={empty}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
