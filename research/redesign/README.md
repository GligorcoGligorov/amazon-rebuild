# Redesign record

Screenshots of every page at 375px (2× density) and 1280px, before and after
the Almanac redesign (D36). File names match across the two folders.

- `before/` — captured from production immediately before R1 deployed, so it
  is the Amazon-clone build exactly as it was submitted.
- `after/` — captured as each redesign step (R1–R5) landed.

| Page | Before | After |
|---|---|---|
| Home | `before/home-*` | `after/home-*` |
| Design system | — (did not exist) | `after/design-system-*` |
| Category | `before/category-*` | `after/category-*` |
| Search | `before/search-*` | `after/search-*` |
| Product | `before/product-*` | `after/product-*` |
| Add-to-cart drawer | `before/drawer-*` | `after/drawer-*` |
| Cart | `before/cart-*` | `after/cart-*` |
| Sign in | `before/sign-in-*` | `after/sign-in-*` |
| Checkout, first step | `before/checkout-*` | `after/checkout-*` |
| Checkout, review step | — | `after/checkout-review-*` |
| Account | `before/account-*` | `after/account-*` |
| Order history | `before/orders-*` | `after/orders-*` |
| Order detail | — | `after/order-*` |

Regenerate with:

```
node research/redesign/capture.mjs <baseURL> <outDir> [page,page,…]
node research/redesign/capture-review.mjs <baseURL> <outDir>
```

Both sign in as the demo account and add to its cart; run `pnpm db:seed`
afterwards against a shared database.
