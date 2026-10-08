import { ARTICLE_STATUS, ORDER_STATUS, PRODUCT_STATUS } from '@/constants';

// Display metadata for statuses. Tones map to StatusBadge styles.
// Labels are the user-facing words; the stored values live in constants/index.js.

export const PRODUCT_STATUS_META = {
  [PRODUCT_STATUS.DRAFT]: { label: 'Draft', tone: 'draft' },
  [PRODUCT_STATUS.PENDING]: { label: 'Pending review', tone: 'ochre' },
  [PRODUCT_STATUS.APPROVED]: { label: 'Approved', tone: 'moss' },
  [PRODUCT_STATUS.REJECTED]: { label: 'Rejected', tone: 'brick' },
  [PRODUCT_STATUS.SOLD]: { label: 'Sold', tone: 'ink' },
};

export const ORDER_STATUS_META = {
  [ORDER_STATUS.PENDING]: { label: 'Awaiting payment', tone: 'ochre', step: 'Order placed' },
  [ORDER_STATUS.PAID]: { label: 'Paid', tone: 'dusk', step: 'Payment confirmed' },
  [ORDER_STATUS.PROCESSING]: { label: 'Processing', tone: 'dusk', step: 'Seller is preparing the order' },
  [ORDER_STATUS.SHIPPED]: { label: 'Shipped', tone: 'dusk', step: 'On its way to you' },
  [ORDER_STATUS.COMPLETED]: { label: 'Completed', tone: 'moss', step: 'Delivered' },
  [ORDER_STATUS.CANCELLED]: { label: 'Cancelled', tone: 'brick', step: 'Order cancelled' },
};

export const ARTICLE_STATUS_META = {
  [ARTICLE_STATUS.DRAFT]: { label: 'Draft', tone: 'draft' },
  [ARTICLE_STATUS.PUBLISHED]: { label: 'Published', tone: 'moss' },
  [ARTICLE_STATUS.ARCHIVED]: { label: 'Archived', tone: 'brick' },
};

export function getStatusMeta(type, status) {
  const table = type === 'order' ? ORDER_STATUS_META : type === 'article' ? ARTICLE_STATUS_META : PRODUCT_STATUS_META;
  return table[status] ?? { label: String(status ?? 'Unknown'), tone: 'draft', step: String(status ?? '') };
}
