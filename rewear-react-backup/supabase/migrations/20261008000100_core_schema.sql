-- RE:WEAR  ·  Migration 1 of 3  ·  Core schema
--
-- Tables, enums, constraints, indexes and the small triggers every table needs.
-- Security (RLS, grants) is in migration 3; one-of-a-kind inventory logic is in migration 2.
--
-- Field names follow the frontend's data model (src/services/mock/seed.js, src/constants/index.js),
-- written in snake_case. The Supabase adapter (a later step) maps snake_case <-> camelCase.
--
-- Money is stored as integer rupiah (the UI never shows decimals).

-- ---------------------------------------------------------------------------
-- Enums  (values match src/constants/index.js exactly)
-- ---------------------------------------------------------------------------
create type public.app_role       as enum ('buyer', 'seller', 'admin');
create type public.product_status as enum ('draft', 'pending', 'approved', 'rejected', 'sold');
create type public.order_status   as enum ('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles  (one row per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '' check (char_length(full_name) <= 120),
  email      text not null check (char_length(email) <= 320),   -- mirror of auth.users.email, for the admin Members page
  role       public.app_role not null default 'buyer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_key on public.profiles (lower(email));
create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role lookups used by RLS policies and guard triggers. SECURITY DEFINER so a policy on
-- "profiles" can ask "is this user an admin?" without recursing into its own policy.
create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

-- Create the profile when a user signs up.
-- SECURITY: the role comes from user-controlled signup metadata, so only 'seller' is honoured;
-- everything else becomes 'buyer'. Admin accounts are never created here (see supabase/README.md).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)), 120),
    new.email,
    case when new.raw_user_meta_data ->> 'role' = 'seller' then 'seller'::public.app_role else 'buyer'::public.app_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the mirrored email in sync if the user changes it in Supabase Auth.
create function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null unique check (char_length(btrim(name)) between 1 and 60),
  description text not null default '' check (char_length(description) <= 300),  -- shown on the admin Categories page
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- products  (every piece is one of a kind)
-- ---------------------------------------------------------------------------
create table public.products (
  id               uuid primary key default gen_random_uuid(),
  seller_id        uuid not null references public.profiles (id) on delete restrict,
  category_id      uuid references public.categories (id) on delete restrict,
  title            text not null default '' check (char_length(title) <= 80),
  brand            text check (char_length(brand) <= 60),
  description      text not null default '' check (char_length(description) <= 800),
  price            integer not null default 0 check (price >= 0),          -- rupiah
  condition        text check (condition in ('like_new', 'excellent', 'good', 'fair')),
  size             text check (char_length(size) <= 20),
  era              text check (char_length(era) <= 20),
  styles           text[] not null default '{}',
  material         text check (char_length(material) <= 120),
  measurements     jsonb not null default '{}'::jsonb check (jsonb_typeof(measurements) = 'object'),  -- { "Chest": 112, ... } in cm
  images           text[] not null default '{}' check (cardinality(images) <= 6),                   -- public URLs / storage paths; first = cover
  status           public.product_status not null default 'draft',
  featured         boolean not null default false,                          -- curators' picks on the homepage
  rejection_reason text,
  reviewed_by      uuid references public.profiles (id) on delete set null,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- A draft only needs a title (mirrors ProductForm). Anything submitted for review must be complete.
  constraint products_title_min check (char_length(btrim(title)) >= 3),
  constraint products_complete_when_submitted check (
    status = 'draft' or (
      char_length(btrim(description)) >= 20
      and category_id is not null
      and size is not null
      and condition is not null
      and price > 0
      and cardinality(images) >= 1
    )
  ),
  -- A rejection always carries the curator's notes; nothing else keeps them.
  constraint products_rejection_reason_consistent check (
    (status = 'rejected' and char_length(btrim(coalesce(rejection_reason, ''))) > 0)
    or (status <> 'rejected' and rejection_reason is null)
  )
);

create index products_status_created_idx on public.products (status, created_at desc);
create index products_seller_idx         on public.products (seller_id);
create index products_category_idx       on public.products (category_id);
create index products_featured_idx       on public.products (created_at desc) where featured;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- wishlist_items / cart_items
-- Each piece is unique, so the cart has no quantity (matches CartContext).
-- ---------------------------------------------------------------------------
create table public.wishlist_items (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index wishlist_items_product_idx on public.wishlist_items (product_id);

create table public.cart_items (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index cart_items_product_idx on public.cart_items (product_id);

-- ---------------------------------------------------------------------------
-- orders / order_items / order_status_events
-- Orders are created ONLY through public.place_order() (migration 2). Clients cannot insert.
-- ---------------------------------------------------------------------------
create sequence public.order_number_seq;

create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  -- Human-readable reference shown to people, e.g. RW-2610-00042 (the mock used RW-<timestamp>).
  order_number   text not null unique
                 default ('RW-' || to_char(now() at time zone 'utc', 'YYMM') || '-' || lpad(nextval('public.order_number_seq')::text, 5, '0')),
  buyer_id       uuid not null references public.profiles (id) on delete restrict,
  status         public.order_status not null default 'pending',
  total          integer not null check (total >= 0),                       -- rupiah; no shipping fee is configured yet
  payment_method text not null check (payment_method in ('bank_transfer', 'e_wallet', 'cod')),
  -- Delivery address snapshot (CheckoutPage: recipient, phone, line, city, postalCode)
  recipient      text not null check (char_length(btrim(recipient)) between 1 and 120),
  phone          text not null check (char_length(btrim(phone)) between 1 and 40),
  address_line   text not null check (char_length(btrim(address_line)) between 1 and 300),
  city           text not null check (char_length(btrim(city)) between 1 and 120),
  postal_code    text not null check (char_length(btrim(postal_code)) between 1 and 20),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index orders_buyer_idx          on public.orders (buyer_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete restrict,
  seller_id   uuid not null references public.profiles (id) on delete restrict,
  -- Snapshot of the piece at purchase time, so history survives later edits (same fields as the cart snapshot).
  title       text not null,
  brand       text,
  size        text,
  image       text,
  price       integer not null check (price >= 0),
  -- Set when the order is cancelled and the piece goes back on sale. NULL = this sale is still active.
  released_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (order_id, product_id)
);
create index order_items_order_idx  on public.order_items (order_id);
create index order_items_seller_idx on public.order_items (seller_id, created_at desc);
create index order_items_product_idx on public.order_items (product_id);

-- Hard guarantee for one-of-a-kind stock: a piece can have at most ONE active sale,
-- regardless of how application code behaves.
create unique index order_items_one_active_sale on public.order_items (product_id) where released_at is null;

-- One row per status the order reaches. Feeds OrderTimeline's `events` (status -> timestamp).
create table public.order_status_events (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  status     public.order_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_status_events_order_idx on public.order_status_events (order_id, created_at);

-- ---------------------------------------------------------------------------
-- articles  (editorial)
-- Mirrors src/services/mock/seed.js `articles`. `body` is the block array the detail page renders:
--   [{ "type": "p" | "h2" | "quote", "text": "..." }, ...]
-- ---------------------------------------------------------------------------
create table public.articles (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text not null check (char_length(btrim(title)) > 0),
  topic        text not null,
  author       text not null,
  excerpt      text not null default '',
  cover_image  text,
  body         jsonb not null default '[]'::jsonb check (jsonb_typeof(body) = 'array'),
  published_at date not null default current_date,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index articles_published_idx on public.articles (published_at desc) where is_published;

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

-- Pieces featured in an article (the mock's `relatedProductIds`), with real foreign keys.
create table public.article_products (
  article_id uuid not null references public.articles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  position   smallint not null default 0,
  primary key (article_id, product_id)
);
create index article_products_product_idx on public.article_products (product_id);
