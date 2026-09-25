# Progress

Handoff note. Rewritten at the end of every milestone. If you are a fresh
session, this plus `CLAUDE.md` and `docs/DECISIONS.md` is everything you need.

**Last updated:** 2026-09-25

---

## Current milestone

**R — Redesign as Almanac (D36).** 8x changed the brief from an Amazon clone to
an original storefront on the same backend. Only the frontend changes; the
schema, queries, Server Actions, auth, cart, checkout and orders must keep
working exactly as they do. Directions in `docs/DESIGN-DIRECTIONS.md`.

The redesign ships page by page, deployed after each step:

1. **R1 — Design system + home.** Done and deployed.
2. **R2 — Product page.**
3. **R3 — Cart page + receipt drawer.**
4. **R4 — Checkout.**
5. **R5 — Search, category, account (and orders, auth forms).**

Before/after screenshots at both widths go in `research/redesign/` —
`node research/redesign/capture.mjs <baseURL> <outDir> [pages]`. The *before*
set was captured from production before R1 deployed.

The M1–M7 build (below) was complete and submitted before the brief changed.

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
  Colour for laptops and smartphones, never a size on a device. Widened after
  review to **13 categories, 84 products, 564 variants** covering all three
  variant shapes — two dimensions, colour only, and none at all. Home shows
  photographic category tiles over a Top rated shelf; category pages show a
  product grid; product pages have a gallery, breadcrumb, three-state variant
  selector, stock and description. Mobile leads with title and price and pins a
  sticky buy bar. 29 e2e tests pass locally **and against the deployed URL**.

- **M3 — Search + filter + sort.** `/search` with `?q=&category=&sort=`, all
  URL state and server-rendered. Header search is a plain GET form — no client
  JavaScript. Category facets carry per-category counts for the current query
  and ignore the category filter, so the sidebar shows what else the same search
  would return. Applied filters are removable chips with a clear-all. Five sorts.
  Two empty states, both with a way out. No ad slots and no duplicate rows, by
  construction. Refined after review: the search box keeps its query so it can be
  edited, matching handles simple plurals plus brand and category name, and a
  category filter with no query is named in the heading. 65 e2e tests pass
  locally **and against the deployed URL**, including a no-JavaScript pass.

- **M4 — Cart.** Guest cart in Postgres keyed by an `httpOnly` session cookie
  (D24). Add to cart opens a **drawer** and never leaves the page (D8), naming
  the exact variant and offering View cart, Checkout and Keep shopping at every
  width. Cart page puts subtotal and checkout above the line items on mobile,
  beside them on desktop. Quantity stepper whose minus becomes a trash icon at 1.
  Header badge is live. Everything works without JavaScript — the drawer is the
  enhancement, not the mechanism. `/checkout` ships a stub so the drawer links
  somewhere real. 92 e2e tests pass locally **and against the deployed URL**.

- **M5 — Auth.** Auth.js credentials with bcrypt: sign up, sign in, sign out.
  The wall guards `/checkout`, `/orders` and `/account` and nothing else (D13);
  signing in from it returns to where the shopper was going, with the **guest
  cart merged** (D27). A seeded demo account (`demo@8xstore.dev` / `demo1234`)
  is shown on the sign-in page with a one-click fill, so a reviewer can reach
  checkout without signing up. Errors are specific on sign-up and deliberately
  vague on sign-in (D28). Account page has three things: orders, addresses,
  sign out. 114 e2e tests pass locally **and against the deployed URL**.

- **M6 — Checkout + orders.** Checkout is a four-step accordion — address →
  delivery → payment → review — on a stripped layout with no nav, no search and
  no cart badge (D11). Finished steps collapse to a one-line summary with a
  *Change* link; the open step lives in the URL, so the back button walks the
  accordion and a validation error cannot lose the shopper's place. A step that
  has not been reached cannot be jumped to. The summary shows `--` for what
  cannot be known yet, resolving in two stages: tax when an address is entered,
  shipping when a speed is chosen. Payment is one pre-selected demo method —
  **no card fields exist anywhere in the app** (D31). Placing an order runs in a
  single transaction over a WebSocket pool that locks the variant rows, verifies
  stock, snapshots the lines, decrements stock and empties the cart (D32).
  Confirmation, order history and order detail all ship; addresses are saved and
  offered again. 144 e2e tests pass locally **and against the deployed URL**.

- **M7 — Polish.** A real 404 with chrome and two exits (it was the bare Next
  default), error boundaries for the shop and for checkout, header tap targets
  raised from 28px to 44px (D35), and an audit of every page at both widths that
  found **no horizontal overflow anywhere**. Loading skeletons were added and
  then removed — they broke the 404 status and the no-JavaScript path (D34). The
  demo account now seeds with two past orders and a saved address, so a reviewer
  lands on filled pages. `README.md` written for reviewers. 157 e2e tests pass
  locally **and against the deployed URL**.

## In progress

- **R1 — Design system + home. Done.** Tokens re-pointed in `globals.css` (old
  names kept, so un-redesigned pages already wear the new palette), three
  fonts, primitives in `components/ui/` (`buttonClass`, `Price`,
  `CatalogueNo`, `Receipt`/`ReceiptLine`, `Wordmark`). New header, footer
  (with a *Design system* link), product card, and home: masthead with a
  product pick, department index, top rated, house rules. `/design-system`
  renders the system from the real components. 157 e2e tests pass.
- **Next: R2 — product page.** Then R3–R5 in order. The product page, cart,
  drawer, checkout, search, category and account pages still have their M-era
  layouts in the new palette.

## Known bugs

None open.

One shipped and was caught on the deployed site: a cart was keyed only by the
session cookie, so signing out left the browser pointing at a cart that now
belonged to a user. A signed-out visitor saw the previous user's items, and the
next account created in that browser inherited them. Fixed by making cart
ownership exclusive and enforcing it with a database constraint (D30), with a
regression spec walking the exact reported path.

## What M7 learned

- **`loading.tsx` is not free.** It streams the response, which flushes a 200
  before `notFound()` can set a 404, and it hides content from users without
  JavaScript. Removed on all four routes (D34).
- **`display: flex` on an anchor changes its accessible name.** Children become
  separate flex items and Chrome joins them with a space, so `8x<span>store` 
  became "8x store". Use padding for height, not flex.
- **A stale `next start` will happily serve an old build** and send you chasing
  a bug that is not there. Kill the port, not just the process name.
- **An audit script beats eyeballing.** One pass over every page at both widths
  found the one real issue (28px tap targets) and proved the absence of the
  thing most likely to be wrong (horizontal overflow).

## What M6 learned

- **The e2e suite eats its own fixtures.** Order specs decrement real stock, and
  after 61 test orders the product every helper reached for was sold out — 28
  specs failed at once and none of them were flaky. Helpers now pick a card that
  can actually be added, the product page defaults to an in-stock variant, and
  `pnpm db:seed` is the reset (D33). **Re-seed after any run against
  production.**
- **A JWT outlives the row it points at.** The seed sweeps throwaway accounts,
  so a browser can hold a token for a user that no longer exists. Reads degrade
  on their own — an unknown id matches no cart — but writes hit a foreign key
  and 500. Cart and checkout writes now verify the user still exists first.
- **Neon's HTTP driver has no transactions.** Anything multi-statement and
  atomic needs the WebSocket pool in `lib/db/pool.ts` (D32).
- **Route groups are how you strip chrome for one flow.** `app/(shop)` keeps the
  header and footer; `app/(checkout)` has its own minimal shell. A nested layout
  cannot remove a parent's header, so this is the only clean way.

## What M5 learned

- **Auth.js v5 beta needs `trustHost: true`.** Without it the credentials
  callback dead-ends on `/api/auth/callback/credentials` and no session cookie
  is written. Costs an hour if you do not know it (D29).
- **`signIn(..., { redirect: false })` did not persist the session cookie** in
  this beta, and a failed sign-in still redirected as though it had worked.
  Credentials are verified before calling `signIn` now, which is also what makes
  the error messages ours to word.
- **Next renders its route announcer with `role="alert"`.** Any `getByRole
  ("alert")` assertion has to be scoped to the form or it matches that instead.
- **Ownership rules need a database constraint, not just careful queries.** The
  cart leak came from a row that was simultaneously a guest cart and a user
  cart. One `CHECK` makes the state unrepresentable; the application code alone
  had already failed to (D30).
- **A regression test has to walk the reported path, not a tidier one.** The
  first version of the ownership spec signed up with an empty cart and passed
  against the buggy code. Only starting as a guest — which is what the report
  described — exercised the claim path where the bug lived.
- **The demo account is shared state.** E2E runs against production filled its
  cart, and the next visitor would have seen it. The seed now clears it and
  sweeps throwaway `@example.test` accounts — re-run `pnpm db:seed` after
  testing against the deployed site.

## What M4 learned

- **Focus restoration races `router.refresh()`.** Three wrong versions before
  one that works — see D26. Any future dialog should gate focus moves on the
  transition's `pending` flag, not a frame or a timer.
- **`sr-only` text is in `innerText`.** Reading a selected chip gave
  `"S — selected"`. Read the value from its legend instead.
- **Two tests passed in isolation and failed under four-worker load.** Both were
  genuine timing exposure, not flakiness to retry away: one was the focus race
  above, the other a hydration-dependent assertion that now says so and waits
  longer.
- **Server Actions as `<form action>` keep the no-JS path free.** The cart's
  stepper and remove controls are plain forms; only the drawer needs the client.

## What M3 learned

- **Chromium does not render a closed `<details>`'s children at all.** CSS
  cannot force one open at a breakpoint, so a disclosure that should be open on
  desktop and closed on mobile needs duplicated markup or a client component.
  Mobile filters became scrolling chip rows instead (D23). Relevant to M4's cart
  drawer, which will be a client component for exactly this kind of reason.
- **`and(a, undefined)` is fine in Drizzle** — optional filters compose without
  array juggling.
- **`goBack()` can resolve before the URL settles.** Use
  `await expect(page).toHaveURL(...)`, not `expect(page.url()).toBe(...)`.
- **`useSearchParams` forces a Suspense boundary**, and whatever the fallback
  renders is what exists before hydration and without JavaScript. A fallback
  that omitted the input silently broke both. The fallback is now the same
  working form with an empty value, and `e2e/search.spec.ts` has a
  `javaScriptEnabled: false` pass so it cannot regress quietly.

## What M2 learned

- **Drizzle's `onConflictDoUpdate` `set` is keyed by TS property, not column
  name.** `image_url:` was silently ignored where `imageUrl:` was needed, so the
  M1 category rows never picked up their images — the seed reported success
  while doing nothing. Any new upsert needs checking against this.
- **`nullsNotDistinct` is on `unique()`, not `uniqueIndex()`.** Without it
  Postgres treats each NULL as distinct, so a no-options product could take two
  `(null, null)` variant rows.
- **The catalog was widened before M3** from 41 products to 84, across 13
  categories, so search has something to work against. See D20.
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
- ~~Catalog size~~ — resolved: widened to 84 products across 13 categories.
