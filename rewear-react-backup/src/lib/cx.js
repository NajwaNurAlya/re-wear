// Tiny class joiner. Skips falsy values.
// Note: there is no tailwind-merge, so avoid passing className values that
// conflict with a component's own utilities (e.g. a second padding scale).
export const cx = (...parts) => parts.filter(Boolean).join(' ');
