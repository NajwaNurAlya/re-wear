// Shared frame for the login and register pages.
export default function AuthPageShell({ eyebrow, title, intro, children }) {
  return (
    <section className="container-page py-12 md:py-20">
      <div className="mx-auto max-w-md">
        <p className="text-meta">{eyebrow}</p>
        <h1 className="display-md mt-3">{title}</h1>
        {intro && <p className="mt-3 text-brown">{intro}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
