import { useId, useRef, useState } from 'react';
import { CloseIcon, SearchIcon } from '@/components/ui/icons';
import { cx } from '@/lib/cx';

/**
 * Controlled:    <SearchBar value={q} onChange={setQ} onSubmit={runSearch} />
 * Uncontrolled:  <SearchBar defaultValue="" onSubmit={(q) => navigate(…)} />
 * onSubmit receives the trimmed query when the person presses Enter.
 */
export default function SearchBar({
  value,
  defaultValue = '',
  onChange,
  onSubmit,
  onClear,
  placeholder = 'Search by item, brand or style',
  label = 'Search pieces',
  autoFocus = false,
  className,
}) {
  const id = useId();
  const inputRef = useRef(null);
  const isControlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const current = isControlled ? value : inner;

  const update = (next) => {
    if (!isControlled) setInner(next);
    onChange?.(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(current.trim());
  };

  const handleClear = () => {
    update('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <form role="search" onSubmit={handleSubmit} className={cx('relative flex items-center', className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <SearchIcon size={18} className="pointer-events-none absolute left-3.5 text-brown" />
      <input
        ref={inputRef}
        id={id}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={current}
        onChange={(e) => update(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full border border-brown/75 bg-cream pr-11 pl-10 text-base text-dark-brown transition-colors placeholder:text-brown/90 focus-visible:border-dark-brown [&::-webkit-search-cancel-button]:appearance-none"
      />
      {current && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-1 grid size-9 place-items-center text-brown hover:text-dark-brown"
        >
          <CloseIcon size={16} />
        </button>
      )}
    </form>
  );
}
