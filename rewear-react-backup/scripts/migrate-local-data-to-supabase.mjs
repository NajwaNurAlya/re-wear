import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_KEYS = {
  wishlist: 'rewear.wishlist',
  sellerProducts: 'rewear.seller-products',
  articles: 'rewear.articles',
  productOverrides: 'rewear.product-overrides',
  orders: 'rewear.orders',
  users: 'rewear.users',
  cart: 'rewear.cart',
  session: 'rewear.session',
};
const PRODUCT_STATUSES = new Set(['draft', 'pending', 'approved', 'rejected', 'sold']);
const ORDER_STATUSES = new Set(['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled']);
const ARTICLE_STATUSES = new Set(['draft', 'published', 'archived']);
const PHOTO_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};
const BUCKET = 'product-images';
const DEMO_ACCOUNTS = [
  { localId: 'buyer-demo', email: 'buyer@rewear.test', password: 'buyer123', role: 'buyer', fullName: 'Dina Buyer' },
  { localId: 'seller-demo', email: 'seller@rewear.test', password: 'seller123', role: 'seller', fullName: 'Sari Seller' },
  { localId: 'admin-demo', email: 'admin@rewear.test', password: 'admin123', role: 'admin', fullName: 'Adi Admin' },
];

const stats = {
  authUsers: 0,
  profiles: 0,
  categories: 0,
  products: 0,
  images: 0,
  articles: 0,
  relatedProducts: 0,
  wishlistItems: 0,
  cartItems: 0,
  orders: 0,
  orderItems: 0,
  skipped: [],
  warnings: [],
};

function log(message) {
  console.log(`[rewear:migrate] ${message}`);
}

function warn(message) {
  stats.warnings.push(message);
  console.warn(`[rewear:migrate:warn] ${message}`);
}

function skip(kind, id, reason) {
  stats.skipped.push({ kind, id, reason });
  console.warn(`[rewear:migrate:skip] ${kind} ${id}: ${reason}`);
}

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

loadEnvFile(resolve(root, '.env.migration.local'));
loadEnvFile(resolve(root, '.env.local'));

function parseArgs() {
  const args = process.argv.slice(2);
  const arg = (name) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : null;
  };
  return {
    dataFile: resolve(root, arg('--file') ?? 'rewear-local-data.json'),
    dryRun: args.includes('--dry-run'),
  };
}

function parseMaybeJson(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readExport(file) {
  if (!existsSync(file)) {
    throw new Error(`LocalStorage export not found: ${file}. Put rewear-local-data.json in the project root or pass --file <path>.`);
  }
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const read = (key, fallback) => parseMaybeJson(raw[key] ?? raw[key.replace('rewear.', '')], fallback);
  return {
    wishlist: read(DATA_KEYS.wishlist, []),
    sellerProducts: read(DATA_KEYS.sellerProducts, []),
    articles: read(DATA_KEYS.articles, []),
    productOverrides: read(DATA_KEYS.productOverrides, {}),
    orders: read(DATA_KEYS.orders, []),
    users: read(DATA_KEYS.users, []),
    cart: read(DATA_KEYS.cart, []),
    session: read(DATA_KEYS.session, null),
  };
}

function uuid(key) {
  const h = createHash('md5').update(`rewear:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function slugify(value) {
  const slug = String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/^cat-/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'uncategorized';
}

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function validDate(value, fallback = new Date().toISOString()) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? fallback : date.toISOString();
}

function publicDate(value) {
  return validDate(value, new Date().toISOString()).slice(0, 10);
}

function productId(localId) {
  return uuid(`product:${localId}`);
}

function articleId(article) {
  return uuid(`article:${article.id ?? article.slug ?? slugify(article.title)}`);
}

function orderId(order) {
  return uuid(`order:${order.id ?? order.orderNumber}`);
}

async function loadMockSeed() {
  const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
  try {
    return await server.ssrLoadModule('/src/services/mock/seed.js');
  } finally {
    await server.close();
  }
}

async function must(result, context) {
  const { data, error } = await result;
  if (error) {
    error.message = `${context}: ${error.message}`;
    throw error;
  }
  return data;
}

async function listAuthUsers(client) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...(data?.users ?? []));
    if ((data?.users ?? []).length < 1000) break;
  }
  return users;
}

async function ensureAuthUsers(client, localUsers) {
  log('Ensuring Auth demo users and local users with recoverable passwords...');
  const byEmail = new Map((await listAuthUsers(client)).map((user) => [normalizeEmail(user.email), user]));
  const candidates = [...DEMO_ACCOUNTS];
  for (const user of asArray(localUsers)) {
    const email = normalizeEmail(user.email);
    if (!email || byEmail.has(email) || candidates.some((item) => item.email === email)) continue;
    if (!user.password) {
      skip('user', user.id ?? email, 'local account has no plain password in export; cannot safely create Supabase Auth user');
      continue;
    }
    candidates.push({
      localId: user.id,
      email,
      password: user.password,
      role: ['buyer', 'seller'].includes(user.role) ? user.role : 'buyer',
      fullName: user.fullName || user.full_name || email.split('@')[0],
    });
  }

  const userMap = new Map();
  for (const account of candidates) {
    let authUser = byEmail.get(account.email);
    if (!authUser) {
      const { data, error } = await client.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName, role: account.role },
      });
      if (error) throw new Error(`create auth user ${account.email}: ${error.message}`);
      authUser = data.user;
      byEmail.set(account.email, authUser);
    } else if (account.email.endsWith('@rewear.test')) {
      const { data, error } = await client.auth.admin.updateUserById(authUser.id, {
        password: account.password,
        email_confirm: true,
        user_metadata: { ...(authUser.user_metadata ?? {}), full_name: account.fullName, role: account.role },
      });
      if (error) throw new Error(`update auth user ${account.email}: ${error.message}`);
      authUser = data.user;
      byEmail.set(account.email, authUser);
    }

    userMap.set(account.localId, authUser.id);
    userMap.set(account.email, authUser.id);
    await must(
      client.from('profiles').upsert({
        id: authUser.id,
        email: account.email,
        full_name: account.fullName,
        role: account.role,
      }, { onConflict: 'id' }).select('id').single(),
      `upsert profile ${account.email}`
    );
  }

  for (const user of asArray(localUsers)) {
    const email = normalizeEmail(user.email);
    const authUser = byEmail.get(email);
    if (user.id && authUser) userMap.set(user.id, authUser.id);
  }

  stats.authUsers = candidates.length;
  stats.profiles = candidates.length;
  return userMap;
}

async function ensureCategories(client, seedCategories, products) {
  log('Mapping categories...');
  const localById = new Map(seedCategories.map((category) => [category.id, category]));
  const needed = new Map();
  for (const category of seedCategories) needed.set(category.slug, category);
  for (const product of products) {
    const seed = localById.get(product.categoryId);
    const slug = seed?.slug ?? slugify(product.categorySlug ?? product.categoryName ?? product.category ?? product.categoryId);
    needed.set(slug, {
      id: product.categoryId,
      slug,
      name: seed?.name ?? product.categoryName ?? product.category ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      description: seed?.description ?? '',
      sortOrder: seed?.sortOrder ?? needed.size,
    });
  }
  const rows = [...needed.values()].map((category) => ({
    id: uuid(`category:${category.slug}`),
    slug: category.slug,
    name: category.name,
    description: category.description ?? '',
    sort_order: category.sortOrder ?? 0,
  }));
  if (rows.length) await must(client.from('categories').upsert(rows, { onConflict: 'slug' }).select('id, slug'), 'upsert categories');
  const existing = await must(client.from('categories').select('id, slug, name'), 'load categories');
  const bySlug = new Map(existing.map((category) => [category.slug, category.id]));
  const map = new Map();
  for (const category of seedCategories) map.set(category.id, bySlug.get(category.slug));
  for (const product of products) {
    const seed = localById.get(product.categoryId);
    const slug = seed?.slug ?? slugify(product.categorySlug ?? product.categoryName ?? product.category ?? product.categoryId);
    map.set(product.categoryId, bySlug.get(slug));
  }
  stats.categories = rows.length;
  return map;
}

function mergeProduct(product, overrides) {
  const override = overrides?.[product.id] ?? {};
  return { ...product, ...override };
}

function normalizeStatus(status, fallback = 'draft') {
  if (PRODUCT_STATUSES.has(status)) return status;
  if (status === 'available') {
    warn('Skipped invalid local product status "available"; using approved because mock public availability maps to approved.');
    return 'approved';
  }
  return fallback;
}

function isDataOrBlobUrl(value) {
  return typeof value === 'string' && (value.startsWith('data:') || value.startsWith('blob:'));
}

function decodeDataPayload(payload) {
  try {
    return decodeURIComponent(payload);
  } catch {
    return payload;
  }
}

function dataUrlParts(value) {
  const match = String(value).match(/^data:([^;,]+)((?:;[^,]*)?),(.*)$/s);
  if (!match) return null;
  const [, mime, params, payload] = match;
  const isBase64 = params.split(';').includes('base64');
  const buffer = isBase64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeDataPayload(payload), 'utf8');
  return { mime, buffer };
}

async function uploadImage(client, value, pathBase, options = {}) {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('data:')) {
    if (value.startsWith('blob:')) return { url: null, skipped: 'blob URL cannot be migrated because browser blob data is gone' };
    return { url: value };
  }
  const parts = dataUrlParts(value);
  if (!parts) return { url: null, skipped: 'invalid data URL' };
  const extension = PHOTO_TYPES[parts.mime];
  if (!extension) {
    return { url: value, skipped: `data URL MIME ${parts.mime} is not accepted by product-images bucket` };
  }
  const hash = options.hashPath ? `-${createHash('sha256').update(parts.buffer).digest('hex').slice(0, 12)}` : '';
  const path = `${pathBase}${hash}.${extension}`;
  const { error } = await client.storage.from(BUCKET).upload(path, parts.buffer, {
    contentType: parts.mime,
    cacheControl: '31536000',
    upsert: true,
  });
  if (!error) {
    stats.images += 1;
    return { url: client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
  }
  if (parts.mime === 'image/svg+xml' && /mime type image\/svg\+xml is not supported/i.test(error.message)) {
    const sharp = await import('sharp').catch(() => null);
    if (!sharp?.default) {
      throw new Error(`upload ${path}: Storage rejected image/svg+xml and no existing SVG rasterizer dependency is available for PNG fallback. Install/configure a supported runtime dependency or allow SVG in the bucket; refusing to upload SVG bytes with a mismatched MIME type.`);
    }
    const pngBuffer = await sharp.default(parts.buffer).png().toBuffer();
    const pngHash = options.hashPath ? `-${createHash('sha256').update(pngBuffer).digest('hex').slice(0, 12)}` : '';
    const pngPath = `${pathBase}${pngHash}.png`;
    const { error: pngError } = await client.storage.from(BUCKET).upload(pngPath, pngBuffer, {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: true,
    });
    if (pngError) throw new Error(`upload ${pngPath}: ${pngError.message}`);
    warn(`Storage rejected SVG MIME for ${path}; uploaded a PNG rasterization generated from the same SVG artwork at ${pngPath}.`);
    stats.images += 1;
    return { url: client.storage.from(BUCKET).getPublicUrl(pngPath).data.publicUrl };
  }
  throw new Error(`upload ${path}: ${error.message}`);
}

async function migrateProducts(client, localProducts, overrides, categoryMap, userMap) {
  log('Migrating products...');
  const localToRemote = new Map();
  const products = asArray(localProducts);
  const remoteIds = products.map((product) => productId(product.id));
  const existingRows = remoteIds.length
    ? await must(client.from('products').select('id, images').in('id', remoteIds), 'load existing product images')
    : [];
  const existingImagesByProduct = new Map(existingRows.map((product) => [product.id, asArray(product.images)]));
  const rows = [];
  for (const original of products) {
    const product = mergeProduct(original, overrides);
    const id = productId(product.id);
    const sellerId = userMap.get(product.sellerId) ?? userMap.get('seller-demo');
    if (!sellerId) throw new Error(`Product ${product.id} cannot be mapped to a seller Auth UUID.`);
    const status = normalizeStatus(product.status, 'draft');
    const images = [];
    const existingImages = existingImagesByProduct.get(id) ?? [];
    for (const [index, image] of asArray(product.images).entries()) {
      const existingImage = existingImages[index];
      if (isDataOrBlobUrl(image) && existingImage && !isDataOrBlobUrl(existingImage)) {
        images.push(existingImage);
        continue;
      }
      const uploaded = await uploadImage(client, image, `${sellerId}/${id}-${index}`, { hashPath: true });
      if (uploaded?.skipped) warn(`Product ${product.id} image ${index}: ${uploaded.skipped}`);
      if (uploaded?.url) images.push(uploaded.url);
    }
    if (status !== 'draft' && images.length === 0) {
      skip('product', product.id, 'submitted product has no migratable image and would violate products_complete_when_submitted');
      continue;
    }
    rows.push({
      id,
      seller_id: sellerId,
      category_id: categoryMap.get(product.categoryId) ?? null,
      title: product.title ?? '',
      brand: product.brand || null,
      description: product.description ?? product.story ?? '',
      price: Number(product.price) || 0,
      condition: product.condition || null,
      size: product.size || null,
      era: product.era || null,
      styles: asArray(product.styles ?? product.style),
      material: product.material || null,
      measurements: product.measurements && typeof product.measurements === 'object' ? product.measurements : {},
      images,
      status,
      featured: Boolean(product.featured) && status === 'approved',
      rejection_reason: status === 'rejected' ? (product.rejectionReason ?? product.rejection_reason ?? 'Migrated local rejection.') : null,
      created_at: validDate(product.createdAt ?? product.created_at),
      updated_at: validDate(product.updatedAt ?? product.updated_at),
    });
    localToRemote.set(product.id, id);
  }
  if (rows.length) await must(client.from('products').upsert(rows, { onConflict: 'id' }).select('id'), 'upsert products');
  stats.products = rows.length;
  return localToRemote;
}

async function migrateArticles(client, articles, productMap) {
  log('Migrating editorial articles...');
  for (const article of asArray(articles)) {
    const id = articleId(article);
    let cover = article.cover ?? article.coverImage ?? article.cover_image ?? null;
    const uploaded = await uploadImage(client, cover, `editorial/${id}-cover`);
    if (uploaded?.skipped) warn(`Article ${article.id ?? article.slug} cover: ${uploaded.skipped}`);
    if (uploaded?.url) cover = uploaded.url;
    const status = ARTICLE_STATUSES.has(article.status) ? article.status : null;
    const isPublished = article.isPublished ?? (status ? status === 'published' : true);
    const archivedAt = article.archivedAt ?? (status === 'archived' ? new Date().toISOString() : null);
    const slug = article.slug ?? slugify(article.title);
    await must(
      client.from('articles').upsert({
        id,
        slug,
        title: article.title ?? slug,
        topic: article.topic ?? article.category ?? 'Story',
        author: article.author ?? article.byline ?? 'RE:WEAR',
        excerpt: article.excerpt ?? '',
        cover_image: cover,
        body: asArray(article.body ?? article.content ?? article.blocks),
        published_at: publicDate(article.publishedAt ?? article.published_at ?? article.createdAt),
        is_published: Boolean(isPublished),
        archived_at: archivedAt,
        created_at: validDate(article.createdAt),
        updated_at: validDate(article.updatedAt),
      }, { onConflict: 'id' }).select('id').single(),
      `upsert article ${slug}`
    );
    stats.articles += 1;
    const links = asArray(article.relatedProductIds ?? article.related_products ?? article.products)
      .map((localProductId, position) => ({ article_id: id, product_id: productMap.get(localProductId), position }))
      .filter((row, position) => {
        if (row.product_id) return true;
        skip('article_product', `${slug}:${position}`, 'related product was not migrated or mapped');
        return false;
      });
    if (links.length) {
      await must(client.from('article_products').upsert(links, { onConflict: 'article_id,product_id' }).select('article_id'), `upsert article links ${slug}`);
      stats.relatedProducts += links.length;
    }
  }
}

function listProductRefs(list) {
  return asArray(list).map((item) => (typeof item === 'string' ? { productId: item } : {
    ...item,
    productId: item.productId ?? item.id,
    userId: item.userId ?? item.ownerId ?? item.buyerId,
  }));
}

async function migrateList(client, table, source, productMap, userMap, fallbackUserLocalId) {
  const rows = [];
  for (const item of listProductRefs(source)) {
    const userId = userMap.get(item.userId) ?? userMap.get(fallbackUserLocalId);
    const product_id = productMap.get(item.productId);
    if (!userId) {
      skip(table, item.productId, 'user could not be mapped');
      continue;
    }
    if (!product_id) {
      skip(table, item.productId, 'product could not be mapped');
      continue;
    }
    rows.push({ user_id: userId, product_id, created_at: validDate(item.createdAt) });
  }
  if (rows.length) await must(client.from(table).upsert(rows, { onConflict: 'user_id,product_id' }).select('product_id'), `upsert ${table}`);
  if (table === 'wishlist_items') stats.wishlistItems = rows.length;
  if (table === 'cart_items') stats.cartItems = rows.length;
}

async function migrateOrders(client, orders, productMap, userMap) {
  log('Migrating orders where local structure is compatible...');
  for (const order of asArray(orders)) {
    const buyerId = userMap.get(order.buyerId) ?? userMap.get(order.userId) ?? userMap.get('buyer-demo');
    const items = asArray(order.items);
    if (!buyerId || !items.length || !order.address) {
      skip('order', order.id ?? order.orderNumber, 'missing buyer, items, or address snapshot');
      continue;
    }
    const mappedItems = [];
    for (const item of items) {
      const product_id = productMap.get(item.productId ?? item.id);
      if (!product_id) {
        skip('order_item', `${order.id}:${item.id ?? item.productId}`, 'product could not be mapped');
        continue;
      }
      mappedItems.push({ ...item, product_id });
    }
    if (!mappedItems.length) {
      skip('order', order.id ?? order.orderNumber, 'no order items could be mapped');
      continue;
    }
    const address = order.address ?? {};
    const id = orderId(order);
    const orderNumber = order.orderNumber ?? order.id ?? `RW-MIG-${id.slice(0, 8).toUpperCase()}`;
    const status = ORDER_STATUSES.has(order.status) ? order.status : 'pending';

    const orderItems = mappedItems.map((item) => ({
      id: uuid(`order-item:${id}:${item.product_id}`),
      order_id: id,
      product_id: item.product_id,
      seller_id: userMap.get(item.sellerId) ?? userMap.get('seller-demo'),
      title: item.title ?? 'Migrated item',
      brand: item.brand ?? null,
      size: item.size ?? null,
      image: item.image ?? null,
      price: Number(item.price) || 0,
      created_at: validDate(order.createdAt),
      released_at: status === 'cancelled' ? validDate(order.updatedAt ?? order.createdAt) : null,
    }));
    if (orderItems.some((item) => !item.seller_id)) {
      skip('order', order.id ?? order.orderNumber, 'one or more order items cannot map seller');
      continue;
    }
    let insertableOrderItems = orderItems;
    if (status !== 'cancelled') {
      const productIds = [...new Set(orderItems.map((item) => item.product_id))];
      const existingActiveItems = productIds.length
        ? await must(client.from('order_items').select('id, product_id').in('product_id', productIds).is('released_at', null), `load active order item conflicts ${order.id}`)
        : [];
      const existingActiveByProduct = new Map(existingActiveItems.map((item) => [item.product_id, item.id]));
      const claimedProducts = new Set();
      insertableOrderItems = [];
      for (const item of orderItems) {
        const existingItemId = existingActiveByProduct.get(item.product_id);
        if (existingItemId && existingItemId !== item.id) {
          warn(`Skipping order item for order ${orderNumber}: product ${item.product_id} already has an active sale (${existingItemId}).`);
          continue;
        }
        if (claimedProducts.has(item.product_id)) {
          warn(`Skipping order item for order ${orderNumber}: product ${item.product_id} appears more than once in active order data.`);
          continue;
        }
        claimedProducts.add(item.product_id);
        insertableOrderItems.push(item);
      }
    }
    const total = insertableOrderItems.length === mappedItems.length
      ? Number(order.total ?? insertableOrderItems.reduce((sum, item) => sum + item.price, 0)) || 0
      : insertableOrderItems.reduce((sum, item) => sum + item.price, 0);
    await must(client.from('orders').upsert({
      id,
      order_number: orderNumber,
      buyer_id: buyerId,
      status,
      total,
      payment_method: ['bank_transfer', 'e_wallet', 'cod'].includes(order.paymentMethod) ? order.paymentMethod : 'bank_transfer',
      recipient: address.recipient ?? order.buyerName ?? 'Migrated buyer',
      phone: address.phone ?? '-',
      address_line: address.line ?? address.addressLine ?? address.address_line ?? '-',
      city: address.city ?? '-',
      postal_code: address.postalCode ?? address.postal_code ?? '-',
      created_at: validDate(order.createdAt),
      updated_at: validDate(order.updatedAt),
    }, { onConflict: 'id' }).select('id').single(), `upsert order ${order.id}`);
    stats.orders += 1;

    if (insertableOrderItems.length) {
      await must(client.from('order_items').upsert(insertableOrderItems, { onConflict: 'id' }).select('id'), `upsert order items ${order.id}`);
      stats.orderItems += insertableOrderItems.length;
    }
    if (status !== 'cancelled' && insertableOrderItems.length) {
      await must(client.from('products').update({ status: 'sold' }).in('id', insertableOrderItems.map((item) => item.product_id)), `mark order products sold ${order.id}`);
    }
  }
}

async function preloadSeedProductMap(productMap, seedProducts) {
  for (const product of seedProducts) productMap.set(product.id, productId(product.id));
}

async function keepOnlyExistingProductMappings(client, productMap) {
  const ids = [...new Set(productMap.values())];
  if (!ids.length) return;
  const existing = new Set();
  for (let index = 0; index < ids.length; index += 500) {
    const chunk = ids.slice(index, index + 500);
    const rows = await must(client.from('products').select('id').in('id', chunk), 'load existing product mappings');
    for (const row of rows) existing.add(row.id);
  }
  for (const [localId, remoteId] of productMap.entries()) {
    if (!existing.has(remoteId)) {
      productMap.delete(localId);
      warn(`Product reference ${localId} maps to ${remoteId}, but that product does not exist in Supabase; related rows will skip it.`);
    }
  }
}

async function verify(client) {
  log('Running integrity verification...');
  const count = async (table) => {
    const { count: value, error } = await client.from(table).select('*', { count: 'exact', head: true });
    if (error) throw error;
    return value ?? 0;
  };
  const [profiles, categories, products, articles, relatedProducts, wishlistItems, cartItems, orders, orderItems] = await Promise.all([
    count('profiles'),
    count('categories'),
    count('products'),
    count('articles'),
    count('article_products'),
    count('wishlist_items'),
    count('cart_items'),
    count('orders'),
    count('order_items'),
  ]);
  const productImages = await must(client.from('products').select('id, images'), 'verify product images');
  const productsForStatus = await must(client.from('products').select('id, status'), 'verify product statuses');
  const invalidStatuses = productsForStatus.filter((product) => !PRODUCT_STATUSES.has(product.status));
  const badImages = productImages.flatMap((product) => asArray(product.images).filter(isDataOrBlobUrl).map((image) => ({ id: product.id, image })));
  if (invalidStatuses.length) throw new Error(`Integrity check failed: products with invalid statuses: ${invalidStatuses.map((p) => p.id).join(', ')}`);
  if (badImages.length) throw new Error(`Integrity check failed: product images still contain blob or migratable data URLs: ${badImages.map((p) => p.id).join(', ')}`);
  return { profiles, categories, products, articles, relatedProducts, wishlistItems, cartItems, orders, orderItems };
}

async function main() {
  const { dataFile, dryRun } = parseArgs();
  if (dryRun) throw new Error('--dry-run is not implemented because this migration verifies live database constraints.');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) throw new Error('SUPABASE_URL is required. Put it in .env.migration.local or the shell environment.');
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Use a local non-VITE environment variable only.');
  if (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) throw new Error('Refusing to run: service-role key must not be stored in any VITE_* variable.');

  const local = readExport(dataFile);
  if (local.session) warn('rewear.session is present in export and intentionally ignored.');
  const seed = await loadMockSeed();
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userMap = await ensureAuthUsers(client, local.users);
  const categoryMap = await ensureCategories(client, seed.categories, [...seed.products, ...asArray(local.sellerProducts)]);
  const productMap = new Map();
  await preloadSeedProductMap(productMap, seed.products);
  for (const product of asArray(local.sellerProducts)) productMap.set(product.id, productId(product.id));

  await migrateProducts(client, local.sellerProducts, local.productOverrides, categoryMap, userMap);
  await keepOnlyExistingProductMappings(client, productMap);
  await migrateArticles(client, local.articles, productMap);
  await migrateList(client, 'wishlist_items', local.wishlist, productMap, userMap, 'buyer-demo');
  await migrateList(client, 'cart_items', local.cart, productMap, userMap, 'buyer-demo');
  await migrateOrders(client, local.orders, productMap, userMap);
  const totals = await verify(client);

  console.log('\nRE:WEAR migration complete.');
  console.log(JSON.stringify({ migratedThisRun: stats, databaseTotals: totals }, null, 2));
}

main().catch((error) => {
  console.error(`\nRE:WEAR migration failed: ${error.message}`);
  if (error.details) console.error(error.details);
  process.exitCode = 1;
});
