# Architecture

Filled in as we build. Sections marked _(planned)_ are intent, not fact — when
a milestone lands, replace the plan with what was actually built.

**Last updated:** 2026-09-22 (M4 shipped — cart and add-to-cart drawer)

---

## Data model

**Built:** `categories`, `products`, `variants`, `carts`, `cart_items` — see
`lib/db/schema.ts` and the migrations in `drizzle/`. `users`, `addresses`,
`orders` and `order_items` are still _(planned)_.

Variant options are generic and positional: a product declares up to two
dimensions (`option1_label`, `option2_label`) and each variant carries the
matching values. That is "Size"/"Colour" for clothing and footwear and
"Storage"/"Colour" for devices, without a column per category. A product with
no choices still gets exactly one variant row, with null values — the
`variants_product_options_key` constraint is `NULLS NOT DISTINCT` so it cannot
take two.

The app reads through the pooled `DATABASE_URL`. Migrations and the seed use
`DATABASE_URL_UNPOOLED` — the pooler does not hold the session state DDL needs.

Intended tables. All ids are uuid; all money is integer cents; all tables carry
`created_at`.

| Table | Purpose | Key fields |
|---|---|---|
| `users` | Accounts | `email` (unique), `password_hash`, `name` |
| `categories` | Browse taxonomy | `slug` (unique), `name` |
| `products` | Catalog identity | `slug` (unique), `title`, `description`, `image_url`, `category_id` |
| `variants` | The sellable unit | `product_id`, `name` (e.g. "Black / Large"), `price_cents`, `stock`, `sku` |
| `carts` | One open cart | `user_id` (nullable — guest carts), `session_token` |
| `cart_items` | Line items | `cart_id`, `variant_id`, `quantity` |
| `addresses` | Saved delivery addresses | `user_id`, name and address fields |
| `orders` | Placed orders | `user_id`, `status`, `total_cents`, shipping address fields |
| `order_items` | Immutable snapshot | `order_id`, `variant_id`, `title`, `variant_name`, `price_cents`, `quantity` |

Three notes worth keeping:

- **Price and stock live on `variants`, never on `products`** — see `D7`. A
  product with no options still gets exactly one variant row. Cart and order
  lines reference a variant, not a product.
- `order_items` copies title, variant name and price at purchase time. Orders
  must not change when the catalog does.
- Carts are keyed by session token so a guest can fill a cart before signing in;
  on sign-in the guest cart merges into the user's, combining rather than
  duplicating any variant present in both.

## Folder structure

_(planned — M1 will replace this with the tree that exists.)_

```
app/                      routes (App Router)
  (shop)/                 browse, search, product detail
  cart/
  checkout/
  orders/
  (auth)/                 sign-in, sign-up
  api/auth/[...nextauth]/ Auth.js handler
components/
  ui/                     primitives (button, input, badge)
  <feature>/              feature components
lib/
  db/
    schema.ts             Drizzle tables
    index.ts              client
    queries/              all reads — components call these, never db directly
    seed.ts
  actions/                Server Actions (mutations)
  auth.ts                 Auth.js config
  utils.ts
drizzle/                  generated migrations (committed)
e2e/                      Playwright specs, one per user flow
docs/                     these documents
.agent-logs/              captured prompts + responses (part of the submission)
```

## Key flows

_(planned — each milestone fills in the flow it shipped: the route, the
components, the query or action, and what the e2e spec asserts.)_

### Browse → product detail

`/` (`app/page.tsx`) renders category tiles and a Top rated shelf from
`getCategories` and `getFeaturedProducts`. `/category/[slug]` renders a grid from
`getProductsInCategory`. `/product/[slug]` renders `getProductBySlug`.

Variant choice is URL state (D19): `?size=M&colour=Black`, resolved server-side
by `resolveVariant`, falling back to the first in-stock variant. The selector is
a list of links in three states — selected, available, out of stock — built by
`buildOptionStates`. Out-of-stock values are shown, never hidden.

Card queries aggregate variants with `min`/`max` so a grid shows one row per
product with a price range, never a row per variant.

### Search and filter

`/search` (`app/search/page.tsx`) reads `?q=&category=&sort=` and calls
`searchProducts` in `lib/db/queries/search.ts`. The header is a plain GET form
posting to `/search`, so search needs no JavaScript.

`q` matches title, description and brand with `ILIKE` (D22). `category` filters
on the category slug. `sort` is one of five explicit keys; unknown values fall
back to `relevance` rather than erroring.

Facet counts are a second query that applies the text filter but **not** the
category filter, so the sidebar shows what else the same search would return.

Every control is a `<Link>` built by `hrefFor`, which preserves the other two
params — filters and sort compose, and back, reload and sharing all work.

### Add to cart

`lib/actions/cart.ts` holds the Server Actions. `addToCart` upserts a
`cart_items` row keyed by `(cart_id, variant_id)`, incrementing with
`least(quantity + n, stock)` so two tabs cannot race past stock (D25). The
session token is an `httpOnly` cookie, written on first mutation only — reads
never create a cart (D24).

`components/add-to-cart.tsx` is the one substantial Client Component: it posts
the same Server Action, intercepts the submit to open the drawer, and calls
`router.refresh()` so the header badge and cart page re-render. With JavaScript
off the form posts normally and the page re-renders with the item added.

The cart page and the quantity stepper are Server Components driving Server
Actions through plain forms, so they need no client JavaScript at all.

### Sign up / sign in, and guest cart merge
To be filled in at M5.

### Checkout → order
To be filled in at M6.

## Rendering and caching

_(planned)_ Catalog pages static or cached and revalidated; cart, checkout and
orders always dynamic and per-user. To be confirmed once real pages exist.
