# Progress

Handoff note. Rewritten at the end of every milestone. If you are a fresh
session, this plus `CLAUDE.md` and `docs/DECISIONS.md` is everything you need.

**Last updated:** 2026-09-22

---

## Current milestone

**M2 — Catalog + product page.** Done and deployed. M3 is next.

**Live URL: https://8x-store.vercel.app** — keep this working at all times (D15).

## Done

- Automatic prompt/response capture into `.agent-logs/` via Claude Code hooks
  (`UserPromptSubmit` + `Stop`). Verified across sessions — see `CAPTURE-TEST.md`.
- `CLAUDE.md` — project context, stack, conventions, standing rules.
- `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`.
- **Research.** `research/FINDINGS.md` plus 44 logged-out screenshots in
  `research/auto/` and 8 signed-in ones in `research/manual/`. The plan below is
  derived from it; read it before M2 and again before M6.
- **Plan approved** (this document, D7–D16).
- **M1 — Scaffold + deploy.** Next.js 16 (App Router, Turbopack) + TypeScript
  strict + Tailwind v4. Neon wired through Drizzle with one committed migration
  (`categories`) and a re-runnable seed. Playwright configured with `mobile-375`
  and `desktop-1280` projects, both on Chromium. Deployed to Vercel with
  `DATABASE_URL` set for all three environments. App shell: header (logo, search
  shell, cart badge), footer, skip link, design tokens. Home reads categories
  live from the database; `/cart` ships its empty state so the header link
  resolves. 10 e2e tests pass locally **and against the deployed URL**.
- **M2 — Catalog + product page.** `products` and `variants` shipped, with
  **price and stock on the variant** (D7). Seeded from dummyjson: 6 categories,
  41 products, 394 variants, 63 of them deliberately out of stock. Variant
  taxonomy is per category — Size + Colour for clothing and footwear, Storage +
  Colour for laptops and smartphones, never a size on a device. Home shows
  photographic category tiles over a Top rated shelf; category pages show a
  product grid; product pages have a gallery, breadcrumb, three-state variant
  selector, stock and description. Mobile leads with title and price and pins a
  sticky buy bar. 29 e2e tests pass locally **and against the deployed URL**.

## In progress

Nothing. M2 is closed. M3 is next.

## Known bugs

None open. Two were found and fixed during M2 — see "What M2 learned".

## What M2 learned

Worth carrying into M3:

- **Drizzle's `onConflictDoUpdate` `set` is keyed by TS property, not column
  name.** `image_url:` was silently ignored where `imageUrl:` was needed, so the
  M1 category rows never picked up their images — the seed reported success
  while doing nothing. Any new upsert needs checking against this.
- **`nullsNotDistinct` is on `unique()`, not `uniqueIndex()`.** Without it
  Postgres treats each NULL as distinct, so a no-options product could take two
  `(null, null)` variant rows.
- **The catalog is thinner than planned:** dummyjson has only 5 products in most
  categories (smartphones has 16), so 6 categories give 41 products, not ~50.
  See D20 — worth knowing before M3 tunes search relevance against it.
- **Variant state is URL state** (D19), so filters in M3 can use exactly the
  same pattern and compose with it.

## What M1 learned

- **Tailwind v4 dropped the `bg-[--token]` syntax.** `@theme` tokens generate
  utilities directly (`--color-ink-900` → `bg-ink-900`); the v3 arbitrary-value
  form silently produces nothing. The first deploy had a white-on-white header
  because of it. Use the generated names.
- **Role and text assertions passed while the page was unreadable.** The e2e
  suite now carries a computed-style guard that asserts the header actually has
  a background and contrasts with its text. Testing what the user can *do* does
  not test whether they can *see* it — D15's manual check caught this, not the
  suite.
- **`tsx` cannot run top-level `await`** in these `.ts` scripts — migrate and
  seed wrap their bodies in `main()`.
- **pnpm 12 gates postinstall scripts** via `allowBuilds:` in
  `pnpm-workspace.yaml`, not `package.json`. esbuild (drizzle-kit) needs it.
- **Migrations use `DATABASE_URL_UNPOOLED`**; the app uses the pooled URL.
- **Next streaming logs `The destination stream closed early`** when Playwright
  navigates mid-render. Noise, not a failure.

---

## Better than Amazon

The five things we deliberately do better, and the three patterns we copy
wholesale. Each is small; together they are the product judgement being judged.
Every milestone below carries the ones that apply to it.

**Fix:**

1. **Add to cart never leaves the page.** Amazon navigates to a full interstitial
   of ads. Ours opens a drawer — "Added to cart", with *View cart* and
   *Checkout* — and the user stays on the product page. (M4)
2. **Mobile product pages lead with title and price.** Amazon puts a sponsored ad
   above the title and the price below a full-screen image, with Add to cart at
   y≈1,770. Ours shows title and price immediately and pins a sticky Add to cart
   bar to the bottom. (M2, wired M4)
3. **No ads, no duplicates.** 20% of Amazon's result cards are sponsored, and the
   same item can appear twice on one page. Ours has neither — clean results,
   visible filters, fast. (M3)
4. **Honest, minimal account page.** Amazon's is 12 cards over ~90 links. Ours
   has three things: orders, addresses, sign out. (M5/M6)
5. **Checkout keeps Amazon's shape** — it is the best thing on their site — but
   without the dead ends. (M6)

**Copy:**

6. **Mobile cart puts the decision first** — subtotal, delivery status and the
   checkout button above the line items, beside them on desktop. (M4)
7. **Price and stock live on the variant, not the product.** A schema decision,
   not a UI one, and expensive to unpick later. (M2)
8. **The auth wall sits only at checkout and orders.** Everything through the
   cart is open to guests; the guest cart merges on sign-in. (M4/M5)

---

## Standing exit criteria

These apply to **every** milestone below, on top of its own criteria. Do not
mark a milestone done until all of them hold.

1. `pnpm typecheck && pnpm lint && pnpm build && pnpm test:e2e` all pass.
2. **Deployed to Vercel and the live URL opened and checked by hand.** There must
   be a working public link at every point in the build, so that running out of
   time still leaves something shipped. A green local build is not a deploy.
3. **The features this milestone shipped are keyboard-operable and correct at
   375px.** Accessibility and responsive behaviour are part of each slice, not
   deferred — M7 is a final pass over finished work, not a cleanup of debt.

---

## Next steps

Each milestone is a vertical slice that is shippable on its own. Every e2e spec
runs at 375px and 1280px.

### M1 — Scaffold + deploy

**Build.** Next.js App Router + TypeScript strict + Tailwind. Neon provisioned,
Drizzle wired with one committed migration. Playwright configured with both
viewport projects. Vercel project linked and deployed. `next.config` with
`images.remotePatterns` for `cdn.dummyjson.com` — decided now so M2 never
touches placeholder imagery (D14). App shell: header (logo, search input shell,
cart badge), footer, colour and spacing tokens.

**Skip.** Auth, real catalog, search behaviour, any styling system beyond
tokens. The search input is inert until M3.

**Exit.** A deployed page renders one row read from the database; one e2e spec
loads it at both widths. Header and footer are keyboard-navigable with a visible
focus ring.

### M2 — Catalog + product page

**Build.** Schema: `categories`, `products`, `variants` — **price and stock on
the variant** (D7). Seed from the dummyjson.com product API: ~50 products across
~6 of its 24 categories, real images from `cdn.dummyjson.com`, prices converted
from float dollars to integer cents. dummyjson has no variant data, so the seed
**synthesises** variants — size and colour for the apparel and footwear
categories, a single variant row for everything else (D14).

Home: category tiles over a featured grid. Category page: product grid. Product
page: gallery, breadcrumb, title, price, variant selector in three states
(selected / available / unavailable — shown, never hidden), stock, description.

Mobile is the judged layout: title and price above the fold, sticky Add to cart
bar at the bottom (inert until M4).

**Skip.** Reviews, ratings, Q&A, recommendations, related products, image zoom,
per-variant galleries. Grid cards for variant products link to the page rather
than adding directly — the same as Amazon's "See options", and it falls out of
the schema for free.

**Exit.** Browse home → category → product at both widths; changing a variant
updates price, stock and the URL. The variant selector is operable by keyboard
and its state is announced, not conveyed by colour alone.

### M3 — Search + filter + sort

**Build.** Search over title and description. Category filter and price sort, all
as URL state (`?q=&category=&sort=`) so back and sharing work and the page stays
server-rendered. Result count, applied-filter chips with individual removal and a
clear-all, and a real empty state that offers a way out.

**Skip.** Type-ahead suggestions, facets beyond category and price, pagination
(~50 products do not need it — revisit past ~100). No sponsored slots and no
duplicate rows, by construction (D10).

**Exit.** A user can find a specific product from the home page at both widths;
filters survive a reload and a back-button press. Filters are reachable and
removable by keyboard, and the result count is announced when it changes.

### M4 — Cart

**Build.** Guest cart keyed by session cookie. Add to cart from the product page
opens a **drawer** — "Added to cart", *View cart*, *Checkout* — without leaving
the page; the sticky mobile bar drives it. Cart page: on mobile, subtotal and
checkout button above the line items; on desktop, a sticky summary beside them.
Line items show the chosen variant attributes. Quantity stepper whose minus
becomes a trash icon at 1. Persists across reload. Empty state with an exit.

**Skip.** Save for later, wish lists, gift options, per-item selection
checkboxes, compare, share, promo codes.

**Exit.** Add → drawer → cart → change quantity → reload persists, at both
widths, **without a full-page navigation on add**. The drawer traps focus,
closes on Escape, and returns focus to the button that opened it.

### M5 — Auth

**Build.** Auth.js credentials: sign up, sign in, sign out, password hashed.
Header reflects signed-in state. **Guest cart merges into the user's cart on
sign-in** — the case that actually breaks in real builds. Account page with
exactly three things: orders, addresses, sign out (both lists empty until M6).
The auth wall guards checkout and orders and nothing else (D13).

**Skip.** OAuth, email verification, password reset, rate limiting, profile
editing, business accounts.

**Exit.** Sign up → cart survives the transition → sign out → sign in → cart
still there, at both widths. `/checkout` signed out redirects to sign-in and
returns to checkout afterwards. Forms have real labels, and validation errors
are associated with their fields.

### M6 — Checkout + orders

**Build.** Checkout on a stripped layout — no nav, no search — as a four-step
accordion: **address → delivery → payment → review**. One step open at a time;
finished steps collapse to a one-line summary with a *Change* link. Order summary
pinned above, showing `--` for shipping and tax until an address exists, then
real numbers. Fake payment (no real processor). Place order → confirmation →
order history and order detail. Addresses saved and reusable, surfaced on the
account page.

**Skip.** Real payments, promo codes, gift cards, pickup locations, split
shipments, a tax API (flat rate, stated as such in the UI), guest checkout —
Amazon has none either.

**Exit.** The whole flow — browse → search → product → cart → sign in → checkout
→ order visible in history — passes end to end at both widths. The accordion is
keyboard-operable, each step's heading is a real heading, and moving between
steps moves focus.

### M7 — Polish

A final pass over finished work, not a cleanup of deferred debt.

**Build.** Consistency sweep of loading, empty and error states. Error
boundaries. Audit pass at 375px and a keyboard walk of the whole flow. Page
metadata and titles that say what the page is. Final deploy.

**Skip.** Animation beyond what the drawer needs, dark mode, image optimisation
past `next/image` defaults.

**Exit.** All standing criteria pass and the full flow is green at both widths on
the deployed URL.

---

## Cut list

Deliberate, not forgotten. Rationale in `docs/DECISIONS.md` under "what I'd do
with more time":

Real payments · reviews and ratings · recommendations · seller accounts · image
upload · inventory management · sponsored placements · Prime-style membership ·
save for later and wish lists · gift options · promo codes · type-ahead
suggestions · pagination · OAuth and password reset.

## Open questions

- ~~Neon and Vercel provisioning~~ — resolved in M1. Both live.
- ~~Product imagery~~ — resolved: dummyjson.com, see D14.
- ~~Category tile images~~ — resolved in M2: each tile uses the first image of
  its first product.
- M3 should confirm whether 41 products is enough to make search and filters
  feel real, or whether to widen the category set (D20).
