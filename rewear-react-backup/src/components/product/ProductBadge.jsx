import { cx } from '@/lib/cx';

// The garment hang-tag (`tag-label` in index.css): era, size, condition.
// Trailing "!" is Tailwind's important modifier so tones beat tag-label's own colours.
const TONES = {
  default: '',
  strong: 'border-dark-brown! bg-dark-brown! text-cream!',
  soft: 'border-muted-pink! bg-muted-pink/30! text-dark-brown!',
};

export default function ProductBadge({ children, tone = 'default', className }) {
  return <span className={cx('tag-label', TONES[tone], className)}>{children}</span>;
}
