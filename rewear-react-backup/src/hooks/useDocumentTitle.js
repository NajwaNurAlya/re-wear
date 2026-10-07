import { useEffect } from 'react';

const BASE = 'RE:WEAR';

// Sets the tab title while a page is mounted, then restores the previous one.
export function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return undefined;
    const previous = document.title;
    document.title = `${title} — ${BASE}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
