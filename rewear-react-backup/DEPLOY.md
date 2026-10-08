# RE:WEAR deploy checklist (Supabase + Vercel)

## 1. Supabase project (production, NOT the demo seed)
1. Create the project. Authentication > Providers: keep Email on. Decide on "Confirm email" (the app handles both).
2. Authentication > URL Configuration: set Site URL to the Vercel domain and add it to Redirect URLs.
3. Apply the four migrations in order (`supabase link --project-ref <ref> && supabase db push`, or paste them into the SQL Editor):
   `..0100_core_schema`, `..0200_inventory_and_guards`, `..0300_rls_policies`, `..0400_storage_product_images`.
4. Do NOT run `supabase/seed.sql` (it creates accounts with public passwords). Create real data instead:
   - categories: insert your own rows into `public.categories`
   - first admin: register normally, then in the SQL Editor
     `update public.profiles set role = 'admin' where email = 'you@example.com';`
5. Storage: confirm the bucket `product-images` exists and is Public.

## 2. Vercel
Environment variables (Production and Preview): `VITE_DATA_SOURCE=supabase`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (anon key only).
Build command `npm run build`, output `dist`. `vercel.json` already adds the SPA rewrite and security headers (CSP allows Supabase and Google Fonts only).

## 3. Smoke test on the deployed site (one pass, about 15 minutes)
| Who | Do | Expect |
|---|---|---|
| Visitor | Home, Explore, filter by category, open a piece, open a story | all load; category links look like `/explore?category=outerwear` |
| Visitor | Add a piece to the bag, then log in as a buyer | the bag item is still there (merged into the account) |
| Seller | Create a listing with 2 photos, submit | photos are Storage URLs (check `products.images`), status `pending` |
| Admin | Curation > approve it | it appears in Explore; reject path asks for notes |
| Buyer A + Buyer B | both put the same piece in the bag; A orders | B's bag marks it "No longer available"; B's checkout is refused |
| Admin / Seller | advance the order | buyer sees the new step in the timeline; seller can only mark shipped |
| Admin | Orders > Cancel order on an unshipped order | the piece returns to Explore |
| Any non-admin | open /admin | redirected (route guard) and the API refuses anyway (RLS) |

## 4. Database checks
`psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_and_inventory.test.sql` against a throwaway database that has the migrations and the seed. It must end with `ALL CHECKS PASSED`.

## 5. Known limits (not blockers, but know them)
- No online payment and no emails: curators follow up on payment and delivery by hand.
- A seller can still write any https URL into `products.images` through the API; the app only ever writes Storage URLs.
- Photos of a piece that is deleted or replaced stay in Storage (no clean-up job).
