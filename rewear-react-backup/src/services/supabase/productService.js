import { PRODUCT_STATUS } from '@/constants';
import { filterProducts, sortProducts } from '@/lib/filters';
import { supabase } from './client';

const PRODUCT_SELECT = '*';
const PHOTO_BUCKET = 'product-images';
const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    sellerId: row.seller_id,
    categoryId: row.category_id,
    title: row.title,
    brand: row.brand ?? '',
    description: row.description ?? '',
    price: Number(row.price ?? 0),
    condition: row.condition ?? '',
    size: row.size ?? '',
    era: row.era ?? '',
    styles: Array.isArray(row.styles) ? [...row.styles] : [],
    material: row.material ?? '',
    measurements: row.measurements && typeof row.measurements === 'object' ? { ...row.measurements } : {},
    images: Array.isArray(row.images) ? [...row.images] : [],
    status: row.status,
    featured: Boolean(row.featured),
    rejectionReason: row.rejection_reason ?? undefined,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function copy(product) {
  return product
    ? {
        ...product,
        images: [...(product.images ?? [])],
        styles: [...(product.styles ?? [])],
        measurements: { ...(product.measurements ?? {}) },
      }
    : null;
}

function mapError(error) {
  const message = error?.code === '42501'
    ? 'You do not have permission to perform this action.'
    : error?.code === '23514'
      ? 'The listing does not meet the requirements for this status.'
      : error?.code === '23503'
        ? 'The selected category or seller is no longer available.'
        : error?.message || 'Unable to load products right now.';
  const wrapped = new Error(message);
  wrapped.code = error?.code;
  wrapped.cause = error;
  return wrapped;
}

async function fetchProducts({ sellerId, ids, includeSold = false } = {}) {
  const client = requireClient();
  let query = client.from('products').select(PRODUCT_SELECT).order('created_at', { ascending: false });

  if (sellerId) query = query.eq('seller_id', sellerId);
  if (ids?.length) query = query.in('id', ids);
  if (!includeSold) query = query.eq('status', PRODUCT_STATUS.APPROVED);

  const { data, error } = await query;
  if (error) throw mapError(error);
  return (data ?? []).map(mapProduct);
}

export const isPublic = (product, { includeSold = false } = {}) =>
  product?.status === PRODUCT_STATUS.APPROVED || (includeSold && product?.status === PRODUCT_STATUS.SOLD);

export async function listProducts({
  featured,
  categoryId,
  style,
  era,
  ids,
  limit,
  includeSold = false,
  search = '',
  styles = [],
  eras = [],
  sizes = [],
  conditions = [],
  minPrice = '',
  maxPrice = '',
  sort,
} = {}) {
  try {
    let list = await fetchProducts({ ids, includeSold });
    if (featured) list = list.filter((product) => product.featured);
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
    if (ids) {
      const order = new Map(ids.map((id, index) => [id, index]));
      list.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    } else {
      list = sortProducts(list, sort);
    }
    return (limit ? list.slice(0, limit) : list).map(copy);
  } catch (error) {
    throw error?.code ? error : mapError(error);
  }
}

export async function getProduct(id) {
  try {
    const client = requireClient();
    const { data, error } = await client
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', id)
      .in('status', [PRODUCT_STATUS.APPROVED, PRODUCT_STATUS.SOLD])
      .maybeSingle();
    if (error) throw error;
    return copy(mapProduct(data));
  } catch (error) {
    throw error?.code ? mapError(error) : error;
  }
}

export async function listRelatedProducts(id, { limit = 4 } = {}) {
  const base = await getProduct(id);
  if (!base) return [];

  const list = await listProducts({ includeSold: false });
  const score = (product) =>
    (product.categoryId === base.categoryId ? 3 : 0) +
    (product.styles ?? []).filter((style) => (base.styles ?? []).includes(style)).length * 2 +
    (product.era === base.era ? 1 : 0);

  return list
    .filter((product) => product.id !== id)
    .sort((a, b) => score(b) - score(a) || String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit)
    .map(copy);
}

export async function listSellerProducts(sellerId) {
  try {
    return (await fetchProducts({ sellerId, includeSold: true })).map(copy);
  } catch (error) {
    throw error?.code ? error : mapError(error);
  }
}

export async function listAllProducts() {
  try {
    return (await fetchProducts({ includeSold: true })).map(copy);
  } catch (error) {
    throw error?.code ? error : mapError(error);
  }
}

// A newly picked photo ({ file, url: blob preview }) is uploaded to Storage under the seller's own folder and replaced by its
// public URL. A photo that is already a URL is kept as it is. Nothing is ever stored in the database as base64.
async function uploadPhoto(client, file, sellerId) {
  const extension = PHOTO_TYPES[file.type];
  if (!extension) throw new Error('Photos must be JPG, PNG or WebP.');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Each photo must be 5 MB or smaller.');
  const path = `${sellerId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(PHOTO_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error('A photo could not be uploaded. Check your connection and try again.');
  return client.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function resolvePhoto(client, photo, sellerId) {
  if (photo?.file) return uploadPhoto(client, photo.file, sellerId);
  const url = typeof photo === 'string' ? photo : photo?.url;
  if (!url || url.startsWith('blob:')) throw new Error('One of the photos is not available any more. Please add it again.');
  return url;
}

function nextStatus(current, intent) {
  if (current?.status === PRODUCT_STATUS.SOLD) {
    throw new Error('Sold listings cannot be edited.');
  }
  if (current?.status === PRODUCT_STATUS.APPROVED || current?.status === PRODUCT_STATUS.PENDING) {
    return PRODUCT_STATUS.PENDING;
  }
  return intent === 'submit' ? PRODUCT_STATUS.PENDING : PRODUCT_STATUS.DRAFT;
}

function productPayload(values, sellerId, status) {
  return {
    seller_id: sellerId,
    title: values.title ?? '',
    description: values.description ?? '',
    category_id: values.categoryId || null,
    brand: values.brand || null,
    size: values.size || null,
    condition: values.condition || null,
    era: values.era || null,
    styles: Array.isArray(values.styles) ? values.styles : (values.style ? [values.style] : []),
    material: values.material || null,
    measurements: values.measurements && typeof values.measurements === 'object' ? values.measurements : {},
    price: Number(values.price) || 0,
    images: values.images ?? [],
    status,
    rejection_reason: null,
    reviewed_by: null,
    reviewed_at: null,
  };
}

function storagePathFromPublicUrl(url, sellerId) {
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    return path.split('/')[0] === sellerId ? path : null;
  } catch {
    return null;
  }
}

async function cleanupRemovedPhotos(client, previousImages, nextImages, sellerId) {
  const keep = new Set(nextImages);
  const paths = previousImages
    .filter((url) => !keep.has(url))
    .map((url) => storagePathFromPublicUrl(url, sellerId))
    .filter(Boolean);
  if (!paths.length) return;
  const { error } = await client.storage.from(PHOTO_BUCKET).remove([...new Set(paths)]);
  if (error && import.meta.env.DEV) console.warn('[supabase product photos]', error.message);
}

export async function saveSellerProduct(values, sellerId, intent, existingId) {
  const uploaded = [];
  try {
    const client = requireClient();
    let current = null;
    if (existingId) {
      const { data, error } = await client
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('id', existingId)
        .eq('seller_id', sellerId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('This listing is no longer available.');
      current = mapProduct(data);
    }

    const images = [];
    for (const photo of values.images ?? []) {
      const resolved = await resolvePhoto(client, photo, sellerId); // in order: the first photo is the cover
      if (photo?.file) uploaded.push(resolved);
      images.push(resolved);
    }
    const status = nextStatus(current, intent);
    const payload = productPayload({ ...values, images }, sellerId, status);

    let query;
    if (existingId) {
      query = client
        .from('products')
        .update(payload)
        .eq('id', existingId)
        .eq('seller_id', sellerId)
        .select(PRODUCT_SELECT)
        .maybeSingle();
    } else {
      query = client.from('products').insert(payload).select(PRODUCT_SELECT).single();
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data) throw new Error('This listing is no longer available.');
    if (current) await cleanupRemovedPhotos(client, current.images ?? [], images, sellerId);
    return copy(mapProduct(data));
  } catch (error) {
    if (uploaded.length) {
      try {
        const client = requireClient();
        const paths = uploaded.map((url) => storagePathFromPublicUrl(url, sellerId)).filter(Boolean);
        if (paths.length) await client.storage.from(PHOTO_BUCKET).remove(paths);
      } catch {
        /* best effort: the product row was not changed, so user data is still intact */
      }
    }
    throw mapError(error);
  }
}

export async function setProductModeration(id, status, rejectionReason = '') {
  if (![PRODUCT_STATUS.APPROVED, PRODUCT_STATUS.REJECTED].includes(status)) {
    throw new Error('Invalid moderation status.');
  }
  try {
    const client = requireClient();
    const payload = {
      status,
      rejection_reason: status === PRODUCT_STATUS.REJECTED ? rejectionReason.trim() : null,
    };
    const { data, error } = await client
      .from('products')
      .update(payload)
      .eq('id', id)
      .select(PRODUCT_SELECT)
      .maybeSingle();
    if (error) throw error;
    return copy(mapProduct(data));
  } catch (error) {
    throw mapError(error);
  }
}

export async function setProductAvailability(id, status) {
  if (![PRODUCT_STATUS.APPROVED, PRODUCT_STATUS.SOLD].includes(status)) {
    throw new Error('Invalid product status.');
  }
  try {
    const client = requireClient();
    const { data, error } = await client.rpc('admin_set_product_status', {
      p_product_id: id,
      p_status: status,
    });
    if (error) throw error;
    return copy(mapProduct(data));
  } catch (error) {
    if (error?.code === 'P0001') throw Object.assign(new Error(error.message), { code: error.code, cause: error });
    throw mapError(error);
  }
}
