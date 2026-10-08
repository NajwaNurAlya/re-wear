# RE:WEAR
*Curated pieces. Second stories.*

Curated thrift and preloved fashion marketplace. React + Vite + Tailwind CSS, Supabase-ready, Vercel-ready.

## Run locally
```bash
npm install
cp .env.example .env.local   # then edit as needed
npm run dev
```

## Build log
| Step | Status |
|---|---|
| 1 Project structure | done |
| 2 Routing and guards | done |
| 3 Global styles | done |
| 4 Reusable components | done |
| 5 Homepage and editorial | done |
| 6 Product catalog (Explore, product detail) | next |

## Components (Step 4)
| Folder | Contents |
|---|---|
| `components/ui` | Button, Input, Select, Textarea, Modal, ConfirmDialog, Toast, EmptyState, Spinner, StatusBadge, Pagination, SearchBar, RatingStars, DataTable, icons |
| `components/product` | ProductCard, ProductGrid, ProductGallery, ProductBadge, FilterPanel, ProductForm |
| `components/dashboard` | DashboardCard, OrderTimeline |
| `components/layout` | Navbar, Footer, Sidebar, PublicLayout, DashboardLayout |

Toasts: call `useToast()` anywhere (`ToastProvider` is mounted in `main.jsx`).
Under `npm run dev`, open `/dev/components` for a live gallery of every component (dev only, not in production builds).

## Data layer (Step 5)
Pages never import seed data directly. They call `@/services`, which picks an adapter from `VITE_DATA_SOURCE`.

| File | Role |
|---|---|
| `services/index.js` | Single entry: exports `productService`, `categoryService`, `editorialService` |
| `services/mock/seed.js` | Seed categories, products and editorial articles (same field names and enums as the future database) |
| `services/mock/artwork.js` | Inline-SVG placeholder photos so the mock needs no network or image licences |
| `services/mock/*Service.js` | Mock adapters. Public listings return approved pieces only, so pending items never leak |
| `hooks/useAsync.js` | `const { data, loading, error, reload } = useAsync(() => service.fn(), [deps])` |

Supabase adapters live in `services/supabase` and return the same shapes as the mock. All services have one (Step 3): auth, profiles, members list, products, categories, editorial, bag, wishlist and orders. See `DEPLOY.md` to go live.

## Step 5 pages and components
| Route | Page |
|---|---|
| `/` | `pages/public/HomePage.jsx`, composed from `components/home/*` (Hero, Featured, Category, Curation, Editorial) |
| `/editorial` | `EditorialListPage.jsx` |
| `/editorial/:slug` | `EditorialDetailPage.jsx` (unknown slug shows a not-found state, not a crash) |

New shared pieces: `components/common/SectionHeader`, `components/editorial/EditorialCard` (variants `feature`, `lead`, `default`, `row`), `ProductGrid columns="quad"`, `ROUTES.exploreWith({ ... })`.

**For Step 6:** homepage links already point to Explore with filters in the query string:
`/explore?category=<category id>`, `/explore?style=Vintage`, `/explore?era=90s`. The keys match `lib/filters.js`, and Explore should read them on load.

Under `npm run dev`, the old route directory now lives at `/dev/routes` (dev only, like `/dev/components`).
