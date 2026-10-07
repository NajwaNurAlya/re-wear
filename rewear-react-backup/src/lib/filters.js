// Catalog filtering, sorting and URL helpers shared by <FilterPanel />, the Explore page
// and the product service (mock now, Supabase later). Everything here is pure.
import { CONDITIONS, ERAS, SIZES, STYLES } from '@/constants';

// Shape of the catalog filter state shared by <FilterPanel /> and the Explore page.
export const EMPTY_FILTERS = {
  category: '',
  sizes: [],
  conditions: [],
  styles: [],
  eras: [],
  minPrice: '',
  maxPrice: '',
};

export function countActiveFilters(f = EMPTY_FILTERS) {
  return (
    (f.category ? 1 : 0) +
    f.sizes.length +
    f.conditions.length +
    f.styles.length +
    f.eras.length +
    (f.minPrice !== '' ? 1 : 0) +
    (f.maxPrice !== '' ? 1 : 0)
  );
}

export const toggleInList = (list, value) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/* ------------------------------------------------------------------ sorting */

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];
export const DEFAULT_SORT = 'newest';

const COMPARERS = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
  'price-asc': (a, b) => a.price - b.price || COMPARERS.newest(a, b),
  'price-desc': (a, b) => b.price - a.price || COMPARERS.newest(a, b),
};

/** Returns a sorted copy. Unknown sort keys fall back to newest. */
export const sortProducts = (list, sort = DEFAULT_SORT) => [...list].sort(COMPARERS[sort] ?? COMPARERS[DEFAULT_SORT]);

/* ---------------------------------------------------------- search + filter */

const norm = (s) => String(s ?? '').toLowerCase();

/** Every word typed must appear in the name, description, brand or styles (case-insensitive). */
export function matchesSearch(product, query) {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = norm(
    [product.title, product.description, product.story, product.brand, ...(product.styles ?? [])]
      .filter(Boolean)
      .join(' ')
  );
  return terms.every((t) => haystack.includes(t));
}

const toNumber = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));

/**
 * Filters combine with AND across groups (category AND size AND condition …)
 * and OR inside a group (size M OR L).
 */
export function matchesFilters(product, f = {}) {
  const { category = '', sizes = [], conditions = [], styles = [], eras = [], minPrice = '', maxPrice = '' } = f;
  const min = toNumber(minPrice);
  const max = toNumber(maxPrice);

  if (category && product.categoryId !== category) return false;
  if (sizes.length && !sizes.includes(product.size)) return false;
  if (conditions.length && !conditions.includes(product.condition)) return false;
  if (styles.length && !(product.styles ?? []).some((s) => styles.includes(s))) return false;
  if (eras.length && !eras.includes(product.era)) return false;
  if (min !== null && product.price < min) return false;
  if (max !== null && product.price > max) return false;
  return true;
}

export const filterProducts = (list, { q = '', filters = {} } = {}) =>
  list.filter((p) => matchesSearch(p, q) && matchesFilters(p, filters));

/* ---------------------------------------------------------------- URL state */
// /explore?q=denim&category=cat-outerwear&style=Vintage&era=90s&size=M&condition=excellent&min=100000&max=300000&sort=price-asc
// Multi-value keys repeat (style=Vintage&style=Y2K); comma lists (style=Vintage,Y2K) are read too.

const readList = (params, key) =>
  params.getAll(key).flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean);

// "vintage" -> "Vintage", "like new" -> "like_new". Unknown values are kept, so they match nothing and stay visible/clearable.
function canonical(values, options) {
  const known = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const out = values.map((v) => {
    const key = norm(v).replace(/[\s_-]+/g, '');
    return known.find((o) => norm(o.value).replace(/[\s_-]+/g, '') === key || norm(o.label).replace(/[\s_-]+/g, '') === key)?.value ?? v;
  });
  return [...new Set(out)];
}

/** URLSearchParams -> { q, filters, sort }. */
export function parseExploreParams(params) {
  const sort = params.get('sort');
  return {
    q: (params.get('q') ?? '').trim(),
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? sort : DEFAULT_SORT,
    filters: {
      category: (params.get('category') ?? '').trim(),
      sizes: canonical(readList(params, 'size'), SIZES),
      conditions: canonical(readList(params, 'condition'), CONDITIONS),
      styles: canonical(readList(params, 'style'), STYLES),
      eras: canonical(readList(params, 'era'), ERAS),
      minPrice: (params.get('min') ?? '').trim(),
      maxPrice: (params.get('max') ?? '').trim(),
    },
  };
}

/** { q, filters, sort } -> URLSearchParams (defaults are left out to keep URLs short). */
export function buildExploreParams({ q = '', filters = EMPTY_FILTERS, sort = DEFAULT_SORT } = {}) {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (filters.category) params.set('category', filters.category);
  filters.sizes.forEach((v) => params.append('size', v));
  filters.conditions.forEach((v) => params.append('condition', v));
  filters.styles.forEach((v) => params.append('style', v));
  filters.eras.forEach((v) => params.append('era', v));
  if (filters.minPrice !== '') params.set('min', filters.minPrice);
  if (filters.maxPrice !== '') params.set('max', filters.maxPrice);
  if (sort !== DEFAULT_SORT) params.set('sort', sort);
  return params;
}

/** Accepts a category id, slug or name ("cat-outerwear", "outerwear", "Outerwear") and returns the id, or the raw value if unknown. */
export function resolveCategoryId(value, categories = []) {
  if (!value) return '';
  const key = norm(value);
  const found = categories.find((c) => norm(c.id) === key || norm(c.slug) === key || norm(c.name) === key);
  return found ? found.id : value;
}
