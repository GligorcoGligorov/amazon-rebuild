# Almanac

An online store — browse, search, product, cart, checkout, orders — built for
an 8x assignment. It began as a rebuild of the core Amazon shopping experience;
8x then changed the brief to an original storefront on the same backend, so the
frontend was redesigned as **Almanac**, a modern store inspired by print
catalogues. The database, Server Actions, auth, cart, checkout and orders did
not change.

**Live: https://8x-store.vercel.app**

**Demo account:** `demo@8xstore.dev` / `demo1234`
The credentials are printed on the sign-in page with a one-click fill, so you can
reach checkout without signing up. The account has two past orders and a saved
address, so the account pages are not empty when you arrive.

> Nothing here takes money. There is no payment SDK, no card field anywhere in
> the app, and no processor keys. "Demo card ending 4242" is a hardcoded string.
> See [D31](docs/DECISIONS.md) for why there is deliberately no card form.

**Design system: https://8x-store.vercel.app/design-system** — the tokens,
type, numbers, controls, product card and receipt, rendered from the real
components (also linked in the footer). The three directions considered and
the reasoning for the choice are in
[`docs/DESIGN-DIRECTIONS.md`](docs/DESIGN-DIRECTIONS.md) and D36; before and
after screenshots at both widths are in [`research/redesign/`](research/redesign/).

---

## The flow to try (about five minutes)

1. **Home → a category tile → a product.** Try a shirt: change Size and Colour
   and watch the price, stock and URL change. Out-of-stock options stay visible
   and dotted rather than disappearing.
2. **Search for `watches`.** It finds them via the singular. Then try `apple`
   (matches a brand) and `laptops` (matches a category name — no product is
   titled that). Filter by category, sort by price; every control is in the URL,
   so back and refresh both work.
3. **Add something to the cart.** The drawer opens over the page — you are not
   taken anywhere. Both *View cart* and *Checkout* are offered at every width.
4. **Open the cart on a phone-width window.** Subtotal and the checkout button
   sit *above* the line items. At quantity 1 the minus becomes a bin icon.
5. **Check out.** Sign in with the demo account when the wall appears — you land
   back on checkout with your cart intact. Watch the summary: shipping and tax
   read `--` until they can actually be known. Finished steps collapse to a line
   with a *Change* link.
6. **Place the order.** Stock decrements, the cart empties and the order appears
   in history — all in one transaction.

Try it at 375px too. Mobile is the judged experience and the layouts differ on
purpose, not just by reflowing.

---

## What I built, in order

Each milestone was a vertical slice that shipped on its own: deployed, tested at
both widths, and committed with its own decisions. The live link has worked at
every point since M1.

| | | |
|---|---|---|
| **M0** | Research | Drove amazon.com logged-out with Playwright, 44 screenshots at both widths, plus 8 signed-in ones. Everything below is argued from [`research/FINDINGS.md`](research/FINDINGS.md), not from memory. |
| **M1** | Scaffold + deploy | Next.js 16, Neon, Drizzle, Playwright, Vercel. A deployed page reading one real row. |
| **M2** | Catalog + product | 13 categories, 84 products, 564 variants. Three-state variant selector. |
| **M3** | Search + filter + sort | All URL state, server-rendered, works without JavaScript. |
| **M4** | Cart | Guest cart in Postgres, add-to-cart drawer, mobile-first cart layout. |
| **M5** | Auth | Credentials, guest-cart merge, demo account, the wall at checkout only. |
| **M6** | Checkout + orders | Four-step accordion, order placement in a transaction. |
| **M7** | Polish | 404, error boundaries, tap targets, this README. |

`docs/PROGRESS.md` is the running handoff note. `docs/DECISIONS.md` has 34
numbered decisions with the reasoning and the trade-off for each.

---

## Where it is deliberately better than Amazon

Each of these came out of the research, and each is a one-line change in
behaviour that took real work to get right.

**Adding to the cart never leaves the page.** Amazon navigates to a full
interstitial carrying two sponsored carousels and a credit-card advert — and its
*mobile* version offers no checkout button at all, so the fastest path to buying
is a dead end. Ours opens a drawer naming the exact variant, with both next
steps, at every width. ([D8](docs/DECISIONS.md))

**Mobile product pages lead with title and price.** Amazon puts a sponsored ad
above the title and the price below a full-screen image, with Add to cart at
y≈1,770 and no sticky bar. Ours shows title and price immediately and pins the
buy bar. ([D9](docs/DECISIONS.md))

**No ads and no duplicates.** 20% of Amazon's desktop result cards are
sponsored, and the same item can appear twice on one page. Both are asserted
absent in the test suite, not merely intended. ([D10](docs/DECISIONS.md))

**Honest totals at checkout.** Shipping and tax read `--` until they can be
known, and resolve in two stages — tax when an address is entered, shipping when
a speed is chosen. A number before that is a guess that would change.
([D11](docs/DECISIONS.md))

**Search facets show what else the query would return.** Category counts ignore
the category filter, so you can see there are 5 laptops before you click.
Amazon does not do this.

**An account page with three things on it**, not twelve cards over ninety links.
([D12](docs/DECISIONS.md))

---

## What I cut, and why

Cutting well is the point at 24 hours; each of these is a deliberate, recorded
choice rather than something forgotten.

- **Real payments.** A test-mode Stripe integration is hours of work and a PCI
  surface for a demo nobody can buy from. No card field exists at all, which is
  also the safest thing to ship publicly. ([D31](docs/DECISIONS.md))
- **Reviews and ratings.** The single thing that would change the product page's
  feel most, and the first thing I would add next.
- **Recommendations, Prime-style membership, seller accounts, gift options,
  promo codes, save-for-later, wish lists.** All of them are Amazon solving
  problems of scale this does not have.
- **Type-ahead suggestions and pagination.** Suggestions are a nice touch that
  would have eaten the search slice; pagination is meaningless over 84 products.
- **Full-text search.** `ILIKE` with a few singular forms finds what people type
  at this size. `tsvector` would be a generated column, a GIN index and a ranking
  function to solve a problem the catalog does not have. ([D22](docs/DECISIONS.md))
- **Loading skeletons.** Added in M7, then removed — a `loading.tsx` streams the
  response, which breaks the 404 *status* on routes that can 404 and hides
  content entirely without JavaScript. The pages are server-rendered and fast
  enough not to need it. ([D34](docs/DECISIONS.md))

---

## Architecture

Next.js App Router, Server Components by default. `"use client"` appears in
exactly four places — the cart drawer, the image gallery, the search box and the
auth/address forms — and every one of them is an enhancement over a working
server-rendered form.

```
app/
  layout.tsx          html/body only
  (shop)/             browse, search, product, cart, account, orders  — full chrome
  (checkout)/         checkout — stripped layout, no nav, no search   (D11)
  api/auth/           Auth.js handler
components/           UI; components/checkout/ for the accordion
lib/
  db/schema.ts        Drizzle tables
  db/queries/         every read — components never import `db`
  db/pool.ts          a second, WebSocket connection, used only for transactions
  actions/            Server Actions (all mutations)
  checkout.ts         money and delivery rules in one place
e2e/                  157 Playwright specs, every one at 375px and 1280px
docs/                 PROGRESS, DECISIONS, ARCHITECTURE
research/             the Amazon research the whole plan is built on
.agent-logs/          captured prompts and responses, part of the submission
```

### Data model

Money is integer cents everywhere, formatted only at the render edge.

| Table | Notes |
|---|---|
| `categories` | 13, seeded from dummyjson |
| `products` | identity only — no price, no stock |
| `variants` | **the sellable unit**: price, stock, up to two options ([D7](docs/DECISIONS.md)) |
| `carts` / `cart_items` | a cart belongs to a session **or** a user, never both, enforced by a CHECK constraint ([D30](docs/DECISIONS.md)) |
| `users`, `addresses` | credentials auth, bcrypt |
| `orders` / `order_items` | the address and every line are **copied**, so editing an address never rewrites a placed order |

Two decisions carried the most weight. Putting price and stock on the *variant*
rather than the product shaped M2 through M6 and would have been expensive to
unpick later. And making cart ownership exclusive fixed a real bug found on the
deployed site, where signing out left the next visitor holding the previous
user's cart.

### Placing an order

One transaction over a WebSocket pool, because Neon's HTTP driver has no
multi-statement transactions: lock the variant rows `FOR UPDATE`, verify stock
*inside* the lock, insert the order and its snapshot lines, decrement stock,
empty the cart. All of it or none of it. ([D32](docs/DECISIONS.md))

---

## Running it locally

```bash
pnpm install
cp .env.local.example .env.local     # fill in DATABASE_URL and AUTH_SECRET
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`AUTH_SECRET` can be any random string:
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

### Checks

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test:e2e
```

Every spec runs at 375px and 1280px. To run them against the deployed site:

```bash
E2E_BASE_URL=https://8x-store.vercel.app pnpm test:e2e
pnpm db:seed   # the suite places real orders — re-seed afterwards (D33)
```

---

## What I would do next

In the order I would actually do it.

1. **Reviews and ratings.** Of everything cut, this changes the product page
   most. The rating is already in the schema; the writing surface is not.
2. **Reserve stock at add-to-cart, not at checkout.** Today a cart can hold
   something that sells out underneath it — handled honestly with a clear
   message at checkout, but real stores reserve earlier.
3. **A separate test database.** The suite places real orders against the same
   Neon instance the live site uses, so stock has to be re-seeded after a
   production run. This is the sharpest operational edge in the repo ([D33](docs/DECISIONS.md)).
4. **Type-ahead suggestions**, with a `tsvector` column and a trigram index
   behind them — worth it once the catalog is thousands rather than 84.
5. **An automated axe pass in the Playwright suite**, so contrast and ARIA
   regressions fail the build rather than waiting for a manual keyboard walk.
6. **Pin Auth.js to a stable release.** The v5 beta cost real time twice: the
   credentials callback silently writes no session without `trustHost`, and
   `signIn(..., { redirect: false })` redirected as though a failed sign-in had
   worked ([D29](docs/DECISIONS.md)).
