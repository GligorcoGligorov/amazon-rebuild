# Decisions

One entry per significant decision. Newest last. Keep entries short — a few
lines each. "What I'd do with more time" is the honest version, not a wishlist.

---

## D1 — Rebuild Amazon depth-first, not breadth-first

**What:** Ship one complete path — browse → search → product → cart → auth →
checkout → order history — rather than a shallow version of many Amazon
surfaces.

**Why:** The assignment is judged on a shipped working product and product
judgement. A complete flow demonstrates both; a wall of half-features
demonstrates neither.

**Alternatives:** Wide surface coverage (reviews, recommendations, Prime,
seller tools) at low depth.

**Trade-offs:** The result will look narrow next to real Amazon. Accepted — the
demo path is the one a judge will actually walk.

**With more time:** Reviews and ratings first (they change the product page's
feel most), then recommendations.

---

## D2 — Next.js App Router, Server Components by default

**What:** App Router with RSC; `"use client"` only at interactive leaves.

**Why:** Catalog and product pages are read-heavy and server-rendered cheaply.
Server Actions remove an entire API layer, which matters at 24h. It is also the
deployment target's native path (Vercel).

**Alternatives:** Pages Router (more familiar, less capable); SPA + separate API
(more code, more time).

**Trade-offs:** RSC/client boundaries are a real source of confusion and will
cost debugging time somewhere.

**With more time:** Partial prerendering on the catalog pages.

---

## D3 — Postgres on Neon with Drizzle

**What:** Neon serverless Postgres, Drizzle ORM, drizzle-kit migrations.

**Why:** Relational data (products, carts, orders, users) wants a relational
database. Neon is serverless and fits Vercel without connection-pool pain.
Drizzle is typed end to end and its migrations are plain reviewable SQL.

**Alternatives:** Prisma (heavier, slower cold starts); SQLite (no good
serverless story on Vercel); a document store (wrong shape for orders).

**Trade-offs:** Drizzle's relational query API is less mature than Prisma's;
some joins will be written by hand.

**With more time:** Proper indexes driven by measured query plans, not guesses.

---

## D4 — Auth.js with a credentials provider

**What:** Email + password via Auth.js credentials, password hashed.

**Why:** No OAuth app registration, no third-party account needed to demo it. A
judge can create an account in ten seconds.

**Alternatives:** OAuth providers (setup friction, external dependency in a
demo); a hosted auth service (another account, another integration).

**Trade-offs:** Credentials auth is the least secure path and Auth.js documents
it as such. Acceptable for a demo with seeded, non-real data; it would not ship.

**With more time:** OAuth alongside credentials, email verification, rate
limiting on the sign-in route.

---

## D5 — Playwright E2E over unit tests

**What:** The test suite is Playwright flow specs at 375px and 1280px. No unit
test layer.

**Why:** The thing being judged is whether the product works for a user. A flow
spec catches the failures that matter — broken forms, broken navigation, broken
responsive layout. Unit tests of a 24h codebase mostly test code that is about
to change.

**Alternatives:** Vitest unit tests (fast, but they would not have caught a
single judged failure); no tests (unacceptable — regressions across seven
milestones are certain).

**Trade-offs:** E2E is slower and flakier. Mitigated by testing user-visible
text and roles rather than implementation selectors.

**With more time:** Unit tests for cart and pricing arithmetic, where the edge
cases are real and a flow spec is a clumsy way to reach them.

---

## D6 — Docs-as-handoff, committed with the agent logs

**What:** `CLAUDE.md` + `docs/PROGRESS.md` + `docs/DECISIONS.md` +
`docs/ARCHITECTURE.md`, read at the start of every session and updated at the
end of every milestone. Code commits include `.agent-logs/`.

**Why:** A 24h build spans multiple sessions with no shared memory between them.
Written state is the only continuity. Committing the logs with the code keeps
the record aligned with what it produced.

**Alternatives:** Relying on conversation history (does not survive a new
session); a single README (mixes durable rules with volatile status).

**Trade-offs:** Doc maintenance costs time each milestone. It is cheaper than
one session re-deriving decisions the previous one already made.

**With more time:** Unchanged — this is the part that has already paid for
itself.

---

## D7 — Price and stock live on the variant, not the product

**What:** `products` holds identity (title, description, category, images);
`variants` holds the sellable unit (colour, size, `price_cents`, `stock`, sku).
Cart and order lines reference a variant. A product with variants cannot be added
to the cart from a grid card — the card links to the product page.

**Why:** Observed on amazon.com: each colour swatch carries its own price
($23.12 / $23.98 / $61.61 for one t-shirt), sizes go out of stock independently,
and variant products show "See options" instead of "Add to cart" in results.
Modelling price on the product cannot express any of that.

**Alternatives:** Price on the product with a variant surcharge (breaks as soon
as two variants differ by more than a delta); a single flat product table and no
variants at all (removes the most interesting UI on the product page).

**Trade-offs:** Every read gets one join deeper, and seed data is more work.
Products without variants still need exactly one row in `variants`, which reads
oddly until you accept it as the sellable-unit table.

**With more time:** Per-variant image galleries, so switching colour switches the
photos.

---

## D8 — Add to cart opens a drawer, never a new page

**What:** Adding from the product page opens a drawer confirming the item with
*View cart* and *Checkout*. The user stays where they were.

**Why:** Amazon navigates to a full interstitial page — on desktop it carries two
sponsored carousels and a credit-card ad; on mobile it omits a checkout button
entirely, so the fastest path to buying is a dead end. Keeping the user on the
page preserves browsing momentum and costs less code than the page it replaces.

**Alternatives:** A toast (too little — no path to checkout); Amazon's
interstitial (an extra route to build and a worse experience).

**Trade-offs:** A drawer is client state, so this is one of the few genuinely
`"use client"` components in the build, and it needs real keyboard and focus
handling to be accessible. Budgeted in M7.

**With more time:** Optimistic quantity updates inside the drawer.

---

## D9 — Mobile product pages lead with title and price, with a sticky buy bar

**What:** At 375px the product page shows title and price before any large
imagery, and pins Add to cart to the bottom of the viewport.

**Why:** Measured on the same Amazon product: desktop puts price at y=398 and Add
to cart at y=815, both within the first screen; mobile pushes Add to cart to
y=1,769 behind a full-viewport image, with a sponsored ad above the title, and
offers no sticky bar. Mobile is the judged experience here.

**Alternatives:** Amazon's order, image first (looks more like a catalogue,
buries the two facts a shopper needs).

**Trade-offs:** A sticky bar costs vertical space on a small screen and has to
not collide with the drawer from D8.

**With more time:** Collapse the bar on scroll-up, the way native apps do.

---

## D10 — No sponsored placements and no duplicate listings

**What:** Search results are ranked only by relevance and the chosen sort. No ad
slots anywhere in the app. One row per product.

**Why:** 12 of 60 desktop result cards on Amazon are sponsored (20%), 6 of 26 on
mobile, and the same ASIN was observed twice in a single result page. A demo
store has no advertisers, so every ad slot would be pure noise — and result
quality is the cheapest place to look better than the original.

**Alternatives:** Faking sponsored slots for realism. Rejected: it would cost
build time to make the product worse.

**Trade-offs:** None for us. Worth stating explicitly so nobody adds a
"featured" ranking hack later and calls it merchandising.

**With more time:** Unchanged.

---

## D11 — Checkout is a collapsing accordion with honest totals

**What:** Stripped layout (no nav, no search). Four steps — address, delivery,
payment, review — one open at a time, finished steps collapsing to a one-line
summary with a *Change* link. Summary pinned above shows `--` for shipping and
tax until an address exists.

**Why:** This is the best-designed flow on Amazon and it is cheap to reproduce:
four server-rendered steps and a summary component. Removing the nav removes
every way to abandon by accident. The `--` is the honest answer — shipping and
tax genuinely cannot be computed before the destination is known, and showing a
placeholder beats inventing a number that changes later.

**Alternatives:** A single long form (more scrolling, worse error recovery on
mobile); a multi-route wizard (more routes, back-button pain).

**Trade-offs:** Accordion state has to survive validation errors and the back
button. Keeping each step a server-rendered URL segment is the mitigation.

**With more time:** Address autocomplete, and a real tax calculation rather than
a stated flat rate.

---

## D12 — The account page shows three things

**What:** Orders, addresses, sign out. Nothing else.

**Why:** Amazon's account page is twelve cards over roughly ninety links across
seven columns — a directory, not a page. Of those, exactly one (Your Orders) is
what people come for. Building the three that matter is honest about what this
app supports and takes an hour instead of a day.

**Alternatives:** A fuller settings surface. It would be mostly links to features
that do not exist.

**Trade-offs:** Looks sparse next to the real thing. Accepted — an empty section
labelled "Payments" would look worse.

**With more time:** Editable profile and saved payment methods, once there is a
real payment integration to attach them to.

---

## D13 — The auth wall sits only at checkout and orders

**What:** Browsing, search, product pages, add to cart and the entire cart work
signed out. Sign-in is required at checkout and at order history, and nowhere
else. The guest cart merges into the user's cart on sign-in.

**Why:** Observed directly on Amazon — the wall is late and narrow, and the
sign-in URL carries a `return_to` so the cart survives the round trip. Gating
earlier costs conversions and, for a judge walking the demo, costs patience.

**Alternatives:** Guest checkout (Amazon has none; it also doubles the order
model, since orders would need to exist without a user); gating the cart (no
benefit, real cost).

**Trade-offs:** The merge-on-sign-in path is the fiddly bit — duplicate variants
across the two carts have to combine rather than collide. It gets its own e2e
assertion at M5.

**With more time:** Guest checkout with an emailed order-lookup link.

---

## D14 — Seed from dummyjson.com, with synthesised variants

**What:** Catalog seed data comes from the dummyjson.com product API (194
products across 24 categories), including its real product photography served
from `cdn.dummyjson.com`. `next.config` allows that host via
`images.remotePatterns`, configured at M1 rather than M2. Prices convert from
float dollars to integer cents at seed time. dummyjson has **no** variant data,
so the seed synthesises it: size and colour for apparel and footwear categories,
a single variant row for everything else.

**Why:** UI is one of the three judged criteria and nothing makes a store look
fake faster than grey placeholder boxes. Real photography across a real category
spread costs one seed script and no design time. Deciding the image host at M1
means M2 never builds against placeholders and then migrates.

**Alternatives:** Placeholder services (fast, looks like a demo — rejected on
the judging criteria); Unsplash or similar (licensing and rate limits, and the
photos are not product shots); hand-sourced images (hours we do not have).

**Trade-offs:** An external image host is a runtime dependency — if
`cdn.dummyjson.com` is slow or down, the deployed demo looks broken. Accepted for
a 24h build. The synthesised variants mean sizes and colours are plausible rather
than accurate to the pictured item; acceptable, and invisible in the demo.

**With more time:** Download the images at seed time and serve them from Vercel
Blob, removing the third-party runtime dependency.

---

## D15 — Every milestone ends deployed, with the live URL checked by hand

**What:** "Deployed to Vercel and the live URL opened and checked" is an exit
criterion for every milestone, not just M1. A green local build is not a deploy.

**Why:** The first judging criterion is a shipped, working product. A 24h budget
can be cut short at any point, and whatever is live at that moment is the
submission. Deploying only at the end concentrates all deployment risk into the
hour with the least slack — and environment variables, database connectivity and
image hosts fail in ways `next build` does not catch locally.

**Alternatives:** Deploy at M1 and M7 only (less overhead, far more risk);
preview deploys without checking them (catches build failures, not runtime ones).

**Trade-offs:** A few minutes of overhead per milestone, and the discipline not
to skip the manual check when the build is green.

**With more time:** Unchanged — this is cheap insurance that pays for itself the
first time a deploy breaks.

---

## D16 — Accessibility and responsive work ship with each feature

**What:** Each milestone ships its own features keyboard-operable and correct at
375px — the variant selector in M2, filter chips in M3, the cart drawer's focus
trap in M4, form labels in M5, the checkout accordion in M6. M7 is a final pass
over finished work, not a cleanup of accumulated debt.

**Why:** Mobile is the judged experience and these are the interactions the whole
product turns on. Retrofitting a focus trap into a drawer, or keyboard handling
into an accordion, means reopening components that were "done" — and it is the
work that gets dropped when the last milestone runs short, which is exactly when
it is most likely to.

**Alternatives:** A dedicated a11y milestone at the end (the original plan —
concentrates the risk and lands the work in the least reliable hour).

**Trade-offs:** Each slice is slightly slower. The total is not, since the
alternative is rebuilding the same components twice.

**With more time:** An automated axe pass in the Playwright suite, so regressions
fail the build rather than waiting for a manual walk.

---

## D17 — Both Playwright projects run on Chromium

**What:** `mobile-375` uses the iPhone 13 descriptor for viewport, touch and user
agent, but overrides `browserName` to Chromium. `desktop-1280` is Desktop Chrome.

**Why:** What these specs assert is layout and behaviour at a width — the iPhone
descriptor's default WebKit engine costs a second ~90MB browser download on every
clean install and every CI run, for rendering differences these tests do not
check. `E2E_BASE_URL` lets the same suite run against the deployed URL, which is
where real-world differences actually show up.

**Alternatives:** Installing WebKit too (more faithful to iOS Safari, slower
everywhere); testing only one width (rejected — mobile is the judged experience).

**Trade-offs:** A genuine WebKit-only rendering bug would not be caught. Accepted
for a 24h build, and partly covered by the manual check D15 already requires.

**With more time:** Add WebKit as a third project in CI only.

---

## D18 — The e2e suite asserts computed style, not just roles and text

**What:** Alongside role and text assertions, the suite checks that key surfaces
actually render — the header has a non-transparent background and contrasts with
its own text.

**Why:** M1's first deploy shipped a white-on-white header (Tailwind v4 dropped
the v3 `bg-[--token]` syntax without erroring). Every role, text and overflow
assertion passed against a page nobody could read. Testing what a user can *do*
does not test whether they can *see* it.

**Alternatives:** Screenshot snapshots (brittle across engines and font
rendering, and they fail on every intentional design change); relying on the
manual check alone (it caught this one, but it will not catch a regression at
2am on milestone six).

**Trade-offs:** Computed-style assertions couple loosely to design. Mitigated by
asserting a *property* — "there is a background, and it contrasts" — rather than
a specific colour value.

**With more time:** An axe accessibility pass in the same suite, so contrast
regressions fail the build everywhere rather than on one element.

---

## D19 — Variant selection lives in the URL, not client state

**What:** Choosing a size or colour navigates to
`/product/[slug]?size=M&colour=Black`. The product page stays a Server
Component; the selector is a list of links, not a client-side control.

**Why:** A chosen variant is shareable and survives reload and the back button,
which is M2's exit criterion. It keeps the page server-rendered per D2, and the
selector is keyboard-operable for free because links already are. Option labels
become param names (`Size` → `size`), so URLs read like the product rather than
like the schema.

**Alternatives:** Client state with `useState` (faster feel, but the URL stops
describing the page and back breaks); a form POST (a mutation where none is
needed).

**Trade-offs:** Each change is a server round trip, so switching variants is a
navigation rather than instant. Acceptable — the pages are small and cached at
the edge. `scroll={false}` keeps the viewport still.

**With more time:** Prefetch adjacent variants so the round trip disappears.

---

## D20 — The catalog is 84 products across 13 categories

**What:** Shipped at 41 products across 6 categories, then widened before M3 to
84 products and 564 variants across 13, so search and filters have something to
work against. The added categories carry lighter variant shapes: colour only for
sunglasses, bags and both watch categories, and no options at all for phone
accessories.

**Why:** The original six matched the two-dimension variant taxonomy, but 41
products is too thin for search to feel real. The widened set keeps every
category's options honest rather than padding: categories only get a dimension
where one genuinely applies. `mobile-accessories` was added beyond the requested
six to reach the ~80 target, and carries no options at all.

Categories still excluded on purpose: kitchen-accessories (30 products) and
groceries (27) would pad the grid fastest but have nothing sensible to vary.

**Alternatives:** Adding dense categories for volume (fuller grids, meaningless
variants); duplicating products to pad the catalog (dishonest, and D10 rules out
duplicate listings).

**Trade-offs:** Several categories still show only 5 items. Depth sits in the
variants — 564 sellable units across 84 products.

**With more time:** Author a small set of products by hand for the thin
categories, with real variant data rather than synthesised.

---

## D21 — Products with no options add straight from the grid

**What:** A product whose variants offer no choice shows a real "Add to cart"
button on its grid card. Products with options show "See options" and send the
shopper to the product page, as before.

**Why:** "See options" on something with no options to see is a lie and an extra
click. The distinction falls out of the schema — a product either declares option
labels or it does not — so the card can be honest for free.

**Alternatives:** "See options" everywhere (uniform, but wrong for a third of
the catalog); a quick-add on every card including variant products (needs a
variant picker in the grid, which is M4 scope at best).

**Trade-offs:** The card now has an interactive control under a stretched card
link, so the button needs `relative z-10` to stay clickable. There is an e2e
assertion on `elementFromPoint` for exactly this.

**With more time:** A compact variant picker in the card for single-dimension
products, so colour-only items can also add from the grid.
