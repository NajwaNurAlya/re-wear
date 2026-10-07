import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { ROUTES } from '@/constants/routes';

// What actually happens to a piece (product status: pending -> approved). This is a real sequence, so it is numbered.
const STEPS = [
  {
    title: 'A seller submits a piece',
    text: 'Photos, measurements, fabric and an honest condition grade. Flaws are listed up front, not buried.',
  },
  {
    title: 'A curator reviews it',
    text: 'We check the photos, the label and the description against the garment. If something is off, the piece goes back to the seller with notes.',
  },
  {
    title: 'It goes live with its story',
    text: 'Approved pieces are published with their era, size and condition, so what you read is what arrives.',
  },
];

export default function CurationSection() {
  return (
    <section aria-labelledby="curation-title" className="bg-dark-brown text-cream">
      <div className="container-page grid gap-12 py-16 md:py-24 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h2 id="curation-title" className="display-md">Nothing goes live until a curator has looked at it.</h2>
          <p className="mt-6 max-w-md text-cream/80">
            RE:WEAR is not an open flea market. Sellers bring the clothes, and curators decide what is good enough to
            list. That is why the pieces here are fewer, and why you can trust the details.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Button to={ROUTES.explore} variant="soft">Explore pieces</Button>
            <Link to={ROUTES.register} className="link-underline py-2 font-medium decoration-cream/50 hover:decoration-cream">
              Sell with us
            </Link>
          </div>
        </div>

        <ol className="lg:col-span-6 lg:col-start-7">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[3rem_1fr] gap-x-2 border-t border-cream/25 py-6 first:border-t-0 first:pt-0 md:grid-cols-[4rem_1fr] md:py-8 md:first:pt-0">
              <span aria-hidden="true" className="font-serif text-4xl leading-none text-muted-pink lining-nums md:text-5xl">{i + 1}</span>
              <div>
                <h3 className="title">{s.title}</h3>
                <p className="mt-2 text-cream/80">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
