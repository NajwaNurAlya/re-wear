import { useMemo, useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import { SortIcon } from '@/components/ui/icons';
import { cx } from '@/lib/cx';

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };
// Hide secondary columns on narrow screens (full class strings so Tailwind sees them).
const HIDE_BELOW = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };

/**
 * columns: [{
 *   key: 'title',               // field on the row (also the sort key)
 *   header: 'Title',
 *   render: (row) => <b>{row.title}</b>,   // optional custom cell
 *   align: 'left' | 'center' | 'right',
 *   sortable: true,
 *   sortValue: (row) => row.price,         // optional, defaults to row[key]
 *   hideBelow: 'md',                       // hide on screens narrower than md
 * }]
 *
 * Sorting: with no onSortChange the table sorts the rows itself.
 * Pass sort + onSortChange to take over (e.g. server-side sorting): the table then shows rows as given.
 * Pagination is separate: render <Pagination /> below.
 */
export default function DataTable({
  columns,
  rows = [],
  rowKey = 'id',
  caption,
  loading = false,
  loadingRows = 5,
  empty,
  sort,
  onSortChange,
  className,
}) {
  const [innerSort, setInnerSort] = useState(null);
  const activeSort = sort !== undefined ? sort : innerSort;
  const setSort = onSortChange ?? setInnerSort;

  const visibleRows = useMemo(() => {
    if (!activeSort || onSortChange) return rows;
    const col = columns.find((c) => c.key === activeSort.key);
    if (!col) return rows;
    const get = col.sortValue ?? ((r) => r[col.key]);
    const dir = activeSort.direction === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }, [rows, columns, activeSort, onSortChange]);

  const toggleSort = (key) => {
    const direction = activeSort?.key === key && activeSort.direction === 'asc' ? 'desc' : 'asc';
    setSort({ key, direction });
  };

  const getKey = (row, i) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? i);
  const cellClass = (col) => cx('px-4 py-3 align-middle', ALIGN[col.align ?? 'left'], col.hideBelow && HIDE_BELOW[col.hideBelow], col.cellClassName);

  return (
    // Focusable so keyboard users can scroll it sideways on small screens.
    <div role="region" aria-label={caption ?? 'Data table'} tabIndex={0} className={cx('overflow-x-auto border border-beige', className)}>
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-brown/30 bg-beige/40">
            {columns.map((col) => {
              const isActive = activeSort?.key === col.key;
              const ariaSort = col.sortable ? (isActive ? (activeSort.direction === 'desc' ? 'descending' : 'ascending') : 'none') : undefined;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cx('px-4 py-3 text-sm font-medium', ALIGN[col.align ?? 'left'], col.hideBelow && HIDE_BELOW[col.hideBelow], col.headerClassName)}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cx('inline-flex items-center gap-1 hover:underline', col.align === 'right' && 'flex-row-reverse')}
                    >
                      {col.header}
                      <SortIcon size={14} direction={isActive ? activeSort.direction : undefined} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody aria-busy={loading || undefined}>
          {loading ? (
            Array.from({ length: loadingRows }, (_, r) => (
              <tr key={r} className="border-b border-beige last:border-0" aria-hidden="true">
                {columns.map((col) => (
                  <td key={col.key} className={cellClass(col)}>
                    <div className="h-4 max-w-40 animate-pulse bg-beige" />
                  </td>
                ))}
              </tr>
            ))
          ) : visibleRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {empty ?? <EmptyState compact title="Nothing to show yet" description="Items will appear here once there are some." />}
              </td>
            </tr>
          ) : (
            visibleRows.map((row, i) => (
              <tr key={getKey(row, i)} className="border-b border-beige transition-colors last:border-0 hover:bg-beige/20">
                {columns.map((col) => (
                  <td key={col.key} className={cellClass(col)}>
                    {col.render ? col.render(row, i) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {loading && <p className="sr-only" role="status">Loading</p>}
    </div>
  );
}
