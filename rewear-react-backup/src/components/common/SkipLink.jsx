// First tab stop on every layout. Moves focus to <main id="main-content" tabIndex={-1}>.
export default function SkipLink({ targetId = 'main-content', children = 'Skip to content' }) {
  const handleClick = (e) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    e.preventDefault();
    target.focus();
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-dark-brown focus:px-4 focus:py-2 focus:text-sm focus:text-cream"
    >
      {children}
    </a>
  );
}
