# Architecture

Filled in as we build. Sections marked _(planned)_ are intent, not fact — when
a milestone lands, replace the plan with what was actually built.

**Last updated:** 2026-09-22 (M0 — nothing built yet; data model revised after research)

---

## Data model

_(planned — M1/M2 will replace this with the actual Drizzle schema.)_

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
To be filled in at M2.

### Search and filter
To be filled in at M3.

### Add to cart
To be filled in at M4.

### Sign up / sign in, and guest cart merge
To be filled in at M5.

### Checkout → order
To be filled in at M6.

## Rendering and caching

_(planned)_ Catalog pages static or cached and revalidated; cart, checkout and
orders always dynamic and per-user. To be confirmed once real pages exist.
