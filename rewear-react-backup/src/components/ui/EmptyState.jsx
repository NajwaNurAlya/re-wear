import { cx } from '@/lib/cx';

/**
 * <EmptyState title="Your wishlist is empty" description="…" action={<Button to="/explore">Browse pieces</Button>} />
 * Say what is missing and what the person can do next.
 */
export default function EmptyState({ icon, title, description, action, compact = false, as: Heading = 'h2', className }) {
  return (
    <div className={cx('mx-auto flex max-w-md flex-col items-center text-center', compact ? 'py-10' : 'py-16 md:py-24', className)}>
      {icon && <div className="mb-4 text-brown">{icon}</div>}
      <Heading className="title">{title}</Heading>
      {description && <p className="mt-2 text-brown">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
