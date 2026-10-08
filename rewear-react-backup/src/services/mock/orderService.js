import { PRODUCT_STATUS } from '@/constants';
import { listAllProducts, setProductAvailability } from './productService';

const STORAGE_KEY = 'rewear.orders';

function readOrders() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export async function listOrders() {
  return readOrders().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listBuyerOrders(userId) {
  return (await listOrders()).filter((order) => order.buyerId === userId);
}

export async function listSellerOrders(sellerId) {
  return (await listOrders())
    .map((order) => ({ ...order, items: order.items.filter((item) => item.sellerId === sellerId) }))
    .filter((order) => order.items.length > 0);
}

export async function getOrder(id) {
  return readOrders().find((order) => order.id === id) ?? null;
}

export async function createOrder({ buyer, items, address, paymentMethod }) {
  if (!items?.length) throw new Error('Your bag is empty.');
  const products = await listAllProducts();
  const byId = new Map(products.map((product) => [product.id, product]));
  const unavailable = items.filter((item) => byId.get(item.id)?.status !== PRODUCT_STATUS.APPROVED);
  if (unavailable.length) {
    const error = new Error('One or more pieces were just taken or are no longer available. Remove them from your bag and try again.');
    error.code = 'PRODUCT_UNAVAILABLE';
    error.unavailableIds = unavailable.map((item) => item.id);
    throw error;
  }
  const own = items.find((item) => byId.get(item.id)?.sellerId === buyer?.id);
  if (own) throw new Error('You cannot buy your own listing. Remove it from your bag.');
  const now = new Date().toISOString();
  const id = `RW-${Date.now().toString(36).toUpperCase()}`;
  const order = {
    id,
    orderNumber: id,
    buyerId: buyer.id,
    buyerName: buyer.fullName,
    items: items.map((item) => ({ ...item })),
    address,
    paymentMethod,
    total: items.reduce((sum, item) => sum + Number(item.price || 0), 0),
    status: 'pending',
    createdAt: now,
    events: { pending: now },
  };
  writeOrders([order, ...readOrders()]);
  await Promise.all(items.map((item) => setProductAvailability(item.id, PRODUCT_STATUS.SOLD)));
  return order;
}

export async function updateOrderStatus(id, status) {
  const orders = readOrders();
  const order = orders.find((item) => item.id === id);
  if (!order) return null;
  const now = new Date().toISOString();
  const events = { ...order.events };
  if (status === 'processing' && !events.paid) events.paid = now;
  if (status === 'shipped' && !events.processing) events.processing = now;
  if (status === 'completed' && !events.shipped) events.shipped = now;
  order.status = status;
  order.events = { ...events, [status]: now };
  writeOrders(orders);
  if (status === 'cancelled') {
    await Promise.all((order.items ?? []).map((item) => setProductAvailability(item.id, PRODUCT_STATUS.APPROVED)));
  }
  return order;
}
