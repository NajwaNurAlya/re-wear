# RE:WEAR database (Supabase / Postgres)

The frontend talks to this database through `src/services/supabase/*` when `VITE_DATA_SOURCE=supabase`, and runs on the mock adapter otherwise. Deploy steps: `../DEPLOY.md`.

```
supabase/
  migrations/
    20261008000100_core_schema.sql           tables, enums, constraints, indexes, signup trigger
    20261008000200_inventory_and_guards.sql  one-of-a-kind checkout, status-flow guards, order history
    20261008000300_rls_policies.sql          grants + Row Level Security
    20261008000400_storage_product_images.sql  public bucket `product-images`, seller-only writes into <uid>/
  seed.sql                                   GENERATED demo data (same data as the mock)
  tests/rls_and_inventory.test.sql           130 checks, runs in a rolled-back transaction
scripts/generate-seed.mjs                    regenerates seed.sql from src/services/mock/seed.js
```

## Apply it

**Supabase CLI (recommended).** Needs a `supabase/config.toml`; `supabase init` creates one and leaves the existing files alone.

```bash
supabase init            # once; keep the existing migrations/ and seed.sql
supabase start           # local stack
supabase db reset        # applies migrations, then seed.sql
supabase link --project-ref <ref> && supabase db push    # hosted project: migrations only
```

**Dashboard.** Run the four migration files in order in the SQL Editor.

`seed.sql` is demo data. Part 1 creates accounts with the public demo passwords (`buyer123`, `seller123`, `admin123`).
**Do not run it on a production project.** On a hosted throwaway project, create the three demo users in
Authentication first and run only Part 2.

## Environment

```
VITE_DATA_SOURCE=mock          # "supabase" turns every service on
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=        # anon / publishable key only
```

The `service_role` key bypasses RLS. It must never be in a `VITE_` variable, in `src/`, or in git.

## Creating an admin

Public signup can only produce `buyer` or `seller`: the signup trigger ignores any other role in the metadata.
Promote a curator by hand, with the SQL Editor or service role (the API roles have no grant on `profiles.role`):

```sql
update public.profiles set role = 'admin' where email = 'curator@example.com';
```

## Tables

| Table | Purpose |
|---|---|
| `profiles` | one row per auth user: `full_name`, `email` (mirror), `role` |
| `categories` | `slug`, `name`, `description`, `sort_order` |
| `products` | the pieces; `status` draft / pending / approved / rejected / sold |
| `wishlist_items`, `cart_items` | `(user_id, product_id)`, no quantity (every piece is unique) |
| `orders` | buyer, `status`, `total`, `payment_method`, delivery address snapshot |
| `order_items` | price/title snapshot per piece, `seller_id`, `released_at` |
| `order_status_events` | one row per status reached; feeds `OrderTimeline` |
| `articles`, `article_products` | editorial, and the pieces each article features |

## How the business rules are enforced

**Product lifecycle.** Constraints require a title (3+ characters) for a draft, and a full listing (description 20+,
category, size, condition, price > 0, at least one photo) for anything else. A trigger limits who may move a piece:
sellers go `draft | rejected | approved -> draft | pending`; curators go `pending | approved | rejected -> approved | rejected`
(notes required to reject). Nobody through the API can move a piece to or from `sold`.

**One-of-a-kind.** Orders exist only through `place_order(...)`. In one transaction it locks the pieces, checks each is still
`approved` and not the buyer's own, snapshots price and title, marks them `sold`, and clears them from the cart.
A partial unique index (`order_items_one_active_sale`) makes a second active sale of the same piece impossible even if
application code were wrong. A cancelled order releases its pieces back to `approved`.
Error messages are stable codes: `NOT_AUTHENTICATED`, `FORBIDDEN`, `EMPTY_ORDER`, `INVALID_INPUT`, `PRODUCT_UNAVAILABLE`
(the offending ids are in `DETAIL`), `OWN_PRODUCT`.

**Order flow.** `pending -> paid | processing | cancelled`, `paid -> processing | cancelled`, `processing -> shipped | cancelled`,
`shipped -> completed`. Curators may make any legal step; the selling seller may do `processing -> shipped` only; buyers cannot change status.
Through the API only `orders.status` is writable at all.

## RLS in one table

| | anon | buyer | seller | admin |
|---|---|---|---|---|
| approved + sold products | read | read | read | read |
| draft / pending / rejected products | no | no | own: read, create, edit | read, approve/reject |
| profiles | no | own | own | all (read) |
| wishlist, cart | no | own | own | no |
| orders | no | own | those containing their pieces | all |
| categories, editorial | read | read | read | read + write |

## Notes for the Supabase adapter

IDs changed from the mock's readable strings to UUIDs, so the adapter must map. The seed derives each UUID deterministically from
the mock id, so references stay stable between runs.

| Mock | Database |
|---|---|
| `product.id = 'p-chore-jacket'` | `products.id` uuid |
| `categoryId = 'cat-outerwear'` | `category_id` uuid (use `slug` for readable URLs) |
| `sellerId` | `seller_id` |
| `createdAt`, `rejectionReason` | `created_at`, `rejection_reason` |
| `order.id = 'RW-...'` | `orders.order_number` for display, `orders.id` for routes and queries |
| `order.address.{recipient,phone,line,city,postalCode}` | `recipient, phone, address_line, city, postal_code` |
| `order.events = { pending: ts, ... }` | rows of `order_status_events` |
| `article.relatedProductIds` | rows of `article_products` |

The mock marks `paid` as skipped (admin goes `pending -> processing`); the timeline treats a missing `paid` event the same way.

## Tests

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_and_inventory.test.sql
```

Run it after migrations and seed, against a local or throwaway database. It impersonates each role the way PostgREST does,
exercises both the allowed and the forbidden path, and rolls everything back. It ends with `ALL CHECKS PASSED`.

## Rules for future migrations

Every new table in `public` needs `enable row level security`, explicit grants, and policies that name their role.
Never add a policy using `true` for writes. Pin `set search_path = ''` on every `security definer` function.
