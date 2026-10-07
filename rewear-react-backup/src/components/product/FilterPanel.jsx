import { useId, useState } from 'react';
import Input from '@/components/ui/Input';
import { CONDITIONS, ERAS, SIZES, STYLES } from '@/constants';
import { countActiveFilters, toggleInList } from '@/lib/filters';
import { cx } from '@/lib/cx';

const normalize = (options = []) => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

function Group({ legend, children }) {
  return (
    <fieldset className="mt-5 border-t border-beige pt-5">
      <legend className="float-left mb-3 w-full text-sm font-medium">{legend}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

// A checkbox drawn as a selectable hang-tag. The real input stays in the page for keyboard and screen readers.
function Chip({ label, checked, onChange }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className={cx(
          'inline-flex min-h-9 items-center border border-brown/75 px-3 text-sm transition-colors',
          'hover:border-dark-brown peer-checked:border-dark-brown peer-checked:bg-dark-brown peer-checked:text-cream',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-dark-brown'
        )}
      >
        {label}
      </span>
    </label>
  );
}

function ChipGroup({ legend, options, selected, onToggle }) {
  return (
    <Group legend={legend}>
      <div className="flex flex-wrap gap-2">
        {normalize(options).map((o) => (
          <Chip key={o.value} label={o.label} checked={selected.includes(o.value)} onChange={() => onToggle(o.value)} />
        ))}
      </div>
    </Group>
  );
}

/**
 * Controlled catalog filters. `filters` has the shape of EMPTY_FILTERS (lib/filters.js).
 * <FilterPanel filters={f} onChange={setF} onReset={() => setF(EMPTY_FILTERS)} categories={[{ value, label }]} />
 * On screens below lg the body collapses behind a "Show filters" toggle.
 */
export default function FilterPanel({
  filters,
  onChange,
  onReset,
  categories = [],
  sizes = SIZES,
  conditions = CONDITIONS,
  styles = STYLES,
  eras = ERAS,
  className,
}) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const bodyId = `${uid}-body`;
  const active = countActiveFilters(filters);
  const set = (patch) => onChange({ ...filters, ...patch });
  const priceConflict =
    filters.minPrice !== '' && filters.maxPrice !== '' && Number(filters.minPrice) > Number(filters.maxPrice);

  return (
    <section aria-labelledby={`${uid}-title`} className={className}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${uid}-title`} className="title">
          Filters{active > 0 && <span className="ml-2 font-sans text-sm text-brown">({active})</span>}
        </h2>
        <div className="flex items-center gap-4">
          {active > 0 && (
            <button type="button" onClick={onReset} className="link-underline text-sm">Clear all</button>
          )}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((o) => !o)}
            className="link-underline text-sm lg:hidden"
          >
            {open ? 'Hide filters' : 'Show filters'}
          </button>
        </div>
      </div>

      <div id={bodyId} className={cx(open ? 'block' : 'hidden', 'lg:block')}>
        {categories.length > 0 && (
          <Group legend="Category">
            <div className="flex flex-col gap-2">
              {[{ value: '', label: 'All categories' }, ...normalize(categories)].map((c) => (
                <label key={c.value || 'all'} className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="radio"
                    name={`${uid}-category`}
                    checked={filters.category === c.value}
                    onChange={() => set({ category: c.value })}
                    className="size-4 accent-dark-brown"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </Group>
        )}

        <ChipGroup legend="Size" options={sizes} selected={filters.sizes} onToggle={(v) => set({ sizes: toggleInList(filters.sizes, v) })} />
        <ChipGroup legend="Condition" options={conditions} selected={filters.conditions} onToggle={(v) => set({ conditions: toggleInList(filters.conditions, v) })} />
        <ChipGroup legend="Style" options={styles} selected={filters.styles} onToggle={(v) => set({ styles: toggleInList(filters.styles, v) })} />
        <ChipGroup legend="Era" options={eras} selected={filters.eras} onToggle={(v) => set({ eras: toggleInList(filters.eras, v) })} />

        <Group legend="Price">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Min" prefix="Rp" type="number" inputMode="numeric" min="0" step="1000" value={filters.minPrice} onChange={(e) => set({ minPrice: e.target.value })} />
            <Input label="Max" prefix="Rp" type="number" inputMode="numeric" min="0" step="1000" value={filters.maxPrice} onChange={(e) => set({ maxPrice: e.target.value })} />
          </div>
          {priceConflict && <p role="alert" className="mt-2 text-sm text-brick">Minimum is higher than maximum.</p>}
        </Group>
      </div>
    </section>
  );
}
