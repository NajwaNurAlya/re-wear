import { cx } from '@/lib/cx';

// Shown wherever a product has no photo yet. Fills its (aspect-ratio) parent.
export default function ImagePlaceholder({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cx('flex h-full w-full items-center justify-center bg-beige text-brown/50', className)}
    >
      <span className="font-serif text-5xl font-semibold">R</span>
    </div>
  );
}
