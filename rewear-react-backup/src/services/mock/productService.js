import { PRODUCT_STATUS } from '@/constants';
import { filterProducts, sortProducts } from '@/lib/filters';
import { products } from './seed';

const SELLER_PRODUCTS_KEY = 'rewear.seller-products';
const PRODUCT_OVERRIDES_KEY = 'rewear.product-overrides';
const ORDERS_KEY = 'rewear.orders';

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readOverrides() {
  try { return JSON.parse(localStorage.getItem(PRODUCT_OVERRIDES_KEY)) ?? {}; }
  catch { return {}; }
}

function writeOverrides(overrides) {
  localStorage.setItem(PRODUCT_OVERRIDES_KEY, JSON.stringify(overrides));
}

function readOrders() {
  try {
    const value = JSON.parse(localStorage.getItem(ORDERS_KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function allProducts() {
  const overrides = readOverrides();
  const merged = new Map(products.map((product) => [product.id, product]));
  for (const product of readList(SELLER_PRODUCTS_KEY)) merged.set(product.id, { ...merged.get(product.id), ...product });
  return [...merged.values()].map((product) => ({ ...product, ...overrides[product.id] }));
}

// Public visibility rule, mirrored later by the database policy:
// shoppers only see approved pieces. Sold pieces are only returned when a caller (product detail,
// wishlist, order history) explicitly asks with `includeSold`; the catalog never does.
export const isPublic = (p, { includeSold = false } = {}) =>
  p.status === PRODUCT_STATUS.APPROVED || (includeSold && p.status === PRODUCT_STATUS.SOLD);

const copy = (p) => ({ ...p, images: [...(p.images ?? [])], styles: [...(p.styles ?? [])], measurements: { ...(p.measurements ?? {}) } });

/**
 * List public pieces. Newest first unless `sort` says otherwise.
 *   featured, categoryId, ids, limit, includeSold
 *   search                       text matched against name, description, brand and styles
 *   style / styles, era / eras   single value or list (OR inside a group)
 *   sizes, conditions            lists (OR inside a group)
 *   minPrice, maxPrice           inclusive, in rupiah
 *   sort                         'newest' | 'price-asc' | 'price-desc'
 * Different groups combine with AND. When `ids` is given the result keeps that order.
 */
export async function listProducts({
  featured, categoryId, style, era, ids, limit, includeSold = false,
  search = '', styles = [], eras = [], sizes = [], conditions = [], minPrice = '', maxPrice = '', sort,
} = {}) {
  let list = allProducts().filter((p) => isPublic(p, { includeSold }));
  if (featured) list = list.filter((p) => p.featured);

  list = filterProducts(list, {
    q: search,
    filters: {
      category: categoryId ?? '',
      sizes,
      conditions,
      styles: style ? [...styles, style] : styles,
      eras: era ? [...eras, era] : eras,
      minPrice,
      maxPrice,
    },
  });

  if (ids) list = ids.map((id) => list.find((p) => p.id === id)).filter(Boolean);
  else list = sortProducts(list, sort);

  return (limit ? list.slice(0, limit) : list).map(copy);
}

/** One public piece by id, or null. */
export async function getProduct(id) {
  const found = allProducts().find((p) => p.id === id && isPublic(p, { includeSold: true }));
  return found ? copy(found) : null;
}

/**
 * Pieces similar to `id`: same category, shared styles and era rank first, then newest.
 * Never includes the piece itself, and only approved pieces (sold ones are not "available").
 */
export async function listRelatedProducts(id, { limit = 4 } = {}) {
  const list = allProducts();
  const base = list.find((p) => p.id === id);
  if (!base) return [];
  const score = (p) =>
    (p.categoryId === base.categoryId ? 3 : 0) +
    p.styles.filter((s) => base.styles.includes(s)).length * 2 +
    (p.era === base.era ? 1 : 0);

  return list
    .filter((p) => p.id !== id && isPublic(p))
    .sort((a, b) => score(b) - score(a) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(copy);
}

export async function listSellerProducts(sellerId) {
  return allProducts().filter((product) => product.sellerId === sellerId).map(copy);
}

export async function listAllProducts() {
  return allProducts().map(copy);
}

export async function listProductActiveOrderLocks(ids = []) {
  const productIds = new Set(ids);
  const locks = new Map();
  for (const order of readOrders()) {
    if (order.status === 'cancelled') continue;
    for (const item of order.items ?? []) {
      if (!productIds.has(item.id) || locks.has(item.id)) continue;
      locks.set(item.id, {
        orderId: order.id,
        orderNumber: order.orderNumber ?? order.id,
        status: order.status,
      });
    }
  }
  return locks;
}

async function imageData(photo) {
  if (!photo?.file) return photo?.url ?? photo;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('A photo could not be saved. Please try again.'));
    reader.readAsDataURL(photo.file);
  });
}

function nextStatus(current, intent) {
  if (current?.status === PRODUCT_STATUS.SOLD) throw new Error('Sold listings cannot be edited.');
  if (current?.status === PRODUCT_STATUS.APPROVED || current?.status === PRODUCT_STATUS.PENDING) return PRODUCT_STATUS.PENDING;
  return intent === 'submit' ? PRODUCT_STATUS.PENDING : PRODUCT_STATUS.DRAFT;
}

export async function saveSellerProduct(values, sellerId, intent, existingId) {
  const current = allProducts().find((product) => product.id === existingId);
  if (existingId && (!current || current.sellerId !== sellerId)) throw new Error('This listing is no longer available.');
  const images = await Promise.all((values.images ?? []).map(imageData));
  const status = nextStatus(current, intent);
  const product = {
    ...(current ?? {}),
    id: existingId ?? `seller-${Date.now().toString(36)}`,
    sellerId,
    title: values.title,
    description: values.description,
    categoryId: values.categoryId,
    brand: values.brand,
    size: values.size,
    condition: values.condition,
    era: values.era,
    styles: Array.isArray(values.styles) ? values.styles : (values.style ? [values.style] : []),
    material: values.material,
    measurements: values.measurements ?? current?.measurements ?? {},
    price: Number(values.price) || 0,
    images,
    featured: current?.featured ?? false,
    status,
    createdAt: current?.createdAt ?? new Date().toISOString().slice(0, 10),
    rejectionReason: undefined,
  };
  const custom = readList(SELLER_PRODUCTS_KEY);
  const next = existingId ? custom.map((item) => item.id === existingId ? product : item) : [...custom, product];
  if (existingId && !custom.some((item) => item.id === existingId)) next.push(product);
  localStorage.setItem(SELLER_PRODUCTS_KEY, JSON.stringify(next));
  const overrides = readOverrides();
  if (overrides[product.id]) {
    delete overrides[product.id];
    writeOverrides(overrides);
  }
  return copy(product);
}

export async function setProductModeration(id, status, rejectionReason = '') {
  const product = allProducts().find((item) => item.id === id);
  if (!product) return null;
  const overrides = readOverrides();
  overrides[id] = { ...overrides[id], status, rejectionReason: rejectionReason || undefined };
  writeOverrides(overrides);
  return { ...copy(product), status, rejectionReason: rejectionReason || undefined };
}

export async function setProductAvailability(id, status) {
  if (![PRODUCT_STATUS.APPROVED, PRODUCT_STATUS.SOLD].includes(status)) {
    throw new Error('Invalid product status.');
  }
  const product = allProducts().find((item) => item.id === id);
  if (!product) return null;
  if (![PRODUCT_STATUS.APPROVED, PRODUCT_STATUS.SOLD].includes(product.status)) {
    throw new Error('Only approved or sold products can be updated manually.');
  }
  if (product.status === status) return copy(product);
  if (product.status === PRODUCT_STATUS.APPROVED && status !== PRODUCT_STATUS.SOLD) {
    throw new Error('Approved products can only be marked as sold.');
  }
  if (product.status === PRODUCT_STATUS.SOLD && status !== PRODUCT_STATUS.APPROVED) {
    throw new Error('Sold products can only be restored to approved.');
  }
  if (status === PRODUCT_STATUS.APPROVED) {
    const hasActiveOrder = readOrders().some((order) =>
      order.status !== 'cancelled' && (order.items ?? []).some((item) => item.id === id)
    );
    if (hasActiveOrder) {
      throw new Error('This product has an order. Use the order workflow before restoring it.');
    }
  }
  const overrides = readOverrides();
  overrides[id] = { ...overrides[id], status, rejectionReason: undefined };
  writeOverrides(overrides);
  return { ...copy(product), status, rejectionReason: undefined };
}
