import { Fragment } from 'react';
import { useLocation, useParams } from 'react-router-dom';

// Temporary stand-in used by every page until its real step is built.
export default function PlaceholderPage({ title, access, step }) {
  const { pathname } = useLocation();
  const params = Object.entries(useParams());

  return (
    <section className="container-page py-16 md:py-24">
      <p className="text-meta">{access}</p>
      <h1 className="display-lg mt-3">{title}</h1>

      <dl className="mt-10 grid max-w-xl gap-x-6 gap-y-3 border-t border-beige pt-6 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="text-brown">Path</dt>
        <dd className="font-medium break-all">{pathname}</dd>
        {params.map(([key, value]) => (
          <Fragment key={key}>
            <dt className="text-brown">Param “{key}”</dt>
            <dd className="font-medium break-all">{value}</dd>
          </Fragment>
        ))}
        <dt className="text-brown">Built in</dt>
        <dd className="font-medium">Step {step}</dd>
      </dl>
    </section>
  );
}
