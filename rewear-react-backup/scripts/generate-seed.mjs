// Generates supabase/seed.sql from the mock seed (src/services/mock/seed.js), so the database
// demo data can never drift from the mock data the frontend already uses.
//
//   node scripts/generate-seed.mjs
//
// Uses the project's own Vite (SSR module loader) to import seed.js with the "@" alias. No extra dependency.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
let seed;
try {
  seed = await server.ssrLoadModule('/src/services/mock/seed.js');
} finally {
  await server.close();
}
const { demoUsers, categories, products, articles } = seed;

/* ----------------------------------------------------------------- helpers */
// Deterministic UUIDs: the same mock id always maps to the same database id, so the seed is
// re-runnable and the adapter can rely on stable references. (RFC-4122 shaped: version 5, variant 8.)
const uuid = (key) => {
  const h = createHash('md5').update(`rewear:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const q = (value) => (value === undefined || value === null ? 'null' : `'${String(value).replace(/'/g, "''")}'`);
const arr = (list = []) => (list.length ? `array[${list.map(q).join(', ')}]::text[]` : `'{}'::text[]`);
const json = (value) => `${q(JSON.stringify(value))}::jsonb`;
const date = (iso) => `${q(iso)}::timestamptz`;

// Descriptions the admin Categories page currently hardcodes (pages/admin/AdminCategoriesPage.jsx).
const CATEGORY_DESCRIPTIONS = {
  outerwear: 'Jackets, coats and layers made for repeat wear.',
  tops: 'Shirts, blouses and everyday pieces for the upper half.',
  bottoms: 'Trousers, skirts and the pieces that complete a silhouette.',
  dresses: 'One-piece finds, from easy day dresses to occasionwear.',
  knitwear: 'Cardigans and jumpers with texture, warmth and history.',
  accessories: 'Bags and finishing pieces with another story to tell.',
};

const categoryById = new Map(categories.map((c) => [c.id, c]));
const emailById = new Map(demoUsers.map((u) => [u.id, u.email]));
const sellerRef = (sellerId) => {
  const email = emailById.get(sellerId);
  if (!email) throw new Error(`Seed product references unknown seller "${sellerId}".`);
  return `(select id from public.profiles where email = ${q(email)})`;
};

/* -------------------------------------------------------------------- SQL */
const out = [];
const push = (...lines) => out.push(...lines);

push(
  '-- RE:WEAR demo seed.  GENERATED FILE: do not edit by hand.',
  '-- Regenerate with:  node scripts/generate-seed.mjs   (source: src/services/mock/seed.js)',
  '--',
  '-- DEMO DATA ONLY. Part 1 creates accounts with the public demo passwords from the mock login page.',
  '-- Never run this file against a production project. See supabase/README.md.',
  '--',
  '-- Safe to re-run: every insert skips rows that already exist.',
  '',
  '-- ===========================================================================',
  '-- Part 1 · Demo accounts (local Supabase / throwaway projects only)',
  '-- On a hosted project you can instead create these three users in Dashboard > Authentication,',
  '-- then run Part 2 (it finds the seller by email). Signup metadata decides buyer/seller; admin is set below.',
  '-- ==========================================================================='
);

const userValues = demoUsers.map((u) => `  (${q(uuid(`user:${u.id}`))}::uuid, ${q(u.email)}, ${q(u.password)}, ${q(u.fullName)}, ${q(u.role)})`).join(',\n');
push(
  'insert into auth.users (',
  '  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,',
  '  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,',
  '  confirmation_token, recovery_token, email_change_token_new, email_change',
  ')',
  'select',
  "  '00000000-0000-0000-0000-000000000000'::uuid, v.id, 'authenticated', 'authenticated', v.email,",
  '  crypt(v.pw, gen_salt(\'bf\')), now(),',
  '  \'{"provider":"email","providers":["email"]}\'::jsonb,',
  "  jsonb_build_object('full_name', v.full_name, 'role', v.role),",
  "  now(), now(), '', '', '', ''",
  'from (values',
  userValues,
  ') as v(id, email, pw, full_name, role)',
  'where not exists (select 1 from auth.users u where u.email = v.email);',
  '',
  'insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)',
  "select gen_random_uuid(), u.id::text, u.id,",
  "       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),",
  "       'email', now(), now(), now()",
  'from auth.users u',
  `where u.email in (${demoUsers.map((u) => q(u.email)).join(', ')})`,
  '  and not exists (select 1 from auth.identities i where i.user_id = u.id);',
  '',
  '-- The signup trigger only ever grants buyer/seller. Admin is assigned here, deliberately and explicitly.',
  ...demoUsers.filter((u) => u.role === 'admin').map((u) => `update public.profiles set role = 'admin' where email = ${q(u.email)};`),
  ''
);

push(
  '-- ===========================================================================',
  '-- Part 2 · Catalog: categories, products, editorial',
  '-- ==========================================================================='
);

push(
  'insert into public.categories (id, slug, name, description, sort_order) values',
  categories
    .map((c, i) => `  (${q(uuid(`category:${c.slug}`))}::uuid, ${q(c.slug)}, ${q(c.name)}, ${q(c.description ?? CATEGORY_DESCRIPTIONS[c.slug] ?? '')}, ${c.sortOrder ?? i})`)
    .join(',\n'),
  'on conflict do nothing;',
  ''
);

const productRows = products.map((p) => {
  const category = categoryById.get(p.categoryId);
  if (!category) throw new Error(`Seed product "${p.id}" references unknown category "${p.categoryId}".`);
  return [
    '  (',
    `    ${q(uuid(`product:${p.id}`))}::uuid, ${sellerRef(p.sellerId)},`,
    `    ${q(uuid(`category:${category.slug}`))}::uuid,`,
    `    ${q(p.title)}, ${q(p.brand)}, ${q(p.description)}, ${Number(p.price)},`,
    `    ${q(p.condition)}, ${q(p.size)}, ${q(p.era)}, ${arr(p.styles)}, ${q(p.material)},`,
    `    ${json(p.measurements ?? {})},`,
    `    ${arr(p.images)},`,
    `    ${q(p.status)}::public.product_status, ${p.featured ? 'true' : 'false'}, ${date(p.createdAt)}`,
    '  )',
  ].join('\n');
});
push(
  'insert into public.products (',
  '  id, seller_id, category_id, title, brand, description, price,',
  '  condition, size, era, styles, material, measurements, images, status, featured, created_at',
  ') values',
  productRows.join(',\n'),
  'on conflict do nothing;',
  ''
);

push(
  'insert into public.articles (id, slug, title, topic, author, excerpt, cover_image, body, published_at) values',
  articles
    .map((a) => `  (${q(uuid(`article:${a.slug}`))}::uuid, ${q(a.slug)}, ${q(a.title)}, ${q(a.topic)}, ${q(a.author)}, ${q(a.excerpt)}, ${q(a.cover)}, ${json(a.body)}, ${q(a.publishedAt)}::date)`)
    .join(',\n'),
  'on conflict do nothing;',
  ''
);

const links = articles.flatMap((a) =>
  (a.relatedProductIds ?? []).map((pid, i) => `  (${q(uuid(`article:${a.slug}`))}::uuid, ${q(uuid(`product:${pid}`))}::uuid, ${i})`)
);
push('insert into public.article_products (article_id, product_id, position) values', links.join(',\n'), 'on conflict do nothing;', '');

const target = resolve(root, 'supabase/seed.sql');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, out.join('\n'));
console.log(`Wrote ${target}: ${demoUsers.length} users, ${categories.length} categories, ${products.length} products, ${articles.length} articles.`);
