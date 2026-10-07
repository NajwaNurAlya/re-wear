import { useCallback, useEffect, useState } from 'react';

/**
 * Run an async loader and track its state.
 *   const { data, loading, error, reload } = useAsync(() => productService.listProducts(), []);
 * `deps` work like useEffect deps: the loader runs again when they change.
 * Stale responses are ignored, so quick navigation never shows the wrong data.
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((s) => (s.loading && !s.error && s.data === null ? s : { data: null, loading: true, error: null }));
    Promise.resolve()
      .then(loader)
      .then(
        (data) => active && setState({ data, loading: false, error: null }),
        (error) => active && setState({ data: null, loading: false, error })
      );
    return () => {
      active = false;
    };
    // `loader` is intentionally left out: callers pass an inline function and list what it reads in `deps`.
  }, [...deps, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
