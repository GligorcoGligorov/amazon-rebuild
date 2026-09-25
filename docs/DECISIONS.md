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

---

## D22 — Search is case-insensitive substring matching, not full-text

**What:** `searchProducts` matches `q` against title, description and brand with
`ILIKE %term%`. No `tsvector`, no ranking, no stemming. Sorting is explicit and
user-chosen; "Relevance" with a query falls back to rating, and without one to
alphabetical.

**Refined after review:** a query is split on whitespace; every word must match
(AND across words, OR across fields and forms), so "apple watch" narrows rather
than widens. Each word also tries a few singular forms — `-ies→-y`, `-es`, `-s` —
because substring matching already covers singular→plural ("watch" is inside
"Watches") but not the reverse. Matching extends to the **category name**, so
"laptops" returns the Laptops category even though no product is titled that.

**Why:** Across 84 products, substring matching finds what a shopper types and is
one query with no index maintenance or migration. Postgres full-text would add a
generated column, a GIN index and a ranking function to solve a problem this
catalog does not have. Honest naming matters too — the sort is called
"Relevance" and does something defensible rather than pretending to rank.

**Alternatives:** `tsvector` + `ts_rank` (right answer at 10,000 products, wasted
at 84); a search service such as Typesense (another dependency and another
account for a 24h demo).

**Trade-offs:** No typo tolerance and no real stemming — the three suffix rules
are not a Porter stemmer and will miss irregular plurals. Substring matching also
means a query can match mid-word. Both are acceptable at this size and would not
be past a few thousand products.

**With more time:** A `tsvector` column with a trigram index for fuzzy matching,
and the type-ahead suggestions currently on the cut list.

---

## D23 — Mobile filter controls are scrolling chip rows, not a disclosure

**What:** At mobile widths, sort and category each render as a single
horizontally-scrolling row of chips. On desktop, categories become a vertical
sidebar and sort wraps. No JavaScript.

**Why:** Stacked and wrapped, the controls pushed the first product most of a
screen down — the thing Amazon's mobile search gets wrong. Chip rows cost about
one row each and signal more content by letting the next chip peek off the edge.

A `<details>` disclosure was tried first and does not work for this: **Chromium
does not render a closed `<details>` element's children at all**, so CSS cannot
force it open at desktop widths. The alternatives were duplicating the markup
for two breakpoints or making it a client component; a chip row is neither.

**Alternatives:** Amazon's full-screen filter sheet (genuinely good, but it is a
client component with focus management — M3 does not need it at two filter
dimensions); duplicated mobile and desktop markup (two copies of every facet
link in the DOM).

**Trade-offs:** A horizontal scroller can hide options off-screen. Mitigated by
putting the active chip first and letting the next one peek.

**With more time:** The full-screen sheet with a live "Show N results" count,
once there are enough filter dimensions to justify it.

---

## D24 — The cart is a database row keyed by a session cookie

**What:** An `httpOnly` `cart_session` cookie holds a random token; `carts` is
keyed by it and `cart_items` references a **variant**, one row per variant per
cart. Mutations are Server Actions that set the cookie on first write; reads
never create a cart.

**Why:** A guest cart must survive reloads and outlive a tab (D13), and M5 has
to merge it into a user's cart on sign-in — both are far easier against a row
than against `localStorage`, which the server cannot see. `httpOnly` keeps it
out of reach of page scripts. Reads staying side-effect-free means a crawler
hitting every product page does not fill the database with empty carts.

**Alternatives:** `localStorage` (invisible to Server Components, so the header
badge and cart page could not render on the server); a signed cookie holding the
whole cart (no join to live prices or stock, and it grows unbounded).

**Trade-offs:** Every add writes a row, and abandoned guest carts accumulate with
nothing to clean them up.

**With more time:** A scheduled job deleting guest carts untouched for 30 days.

---

## D25 — Cart mutations clamp to stock rather than failing

**What:** Adding 3 of something with 2 left puts 2 in the cart. The increment is
`least(quantity + n, stock)` inside the upsert, so two tabs cannot race past
stock. Quantity changes are scoped to the session's own cart, so an item id from
elsewhere cannot be edited by guessing it.

**Why:** Rejecting the whole action for being one over is worse than doing what
was possible and saying so. Doing the clamp in SQL rather than read-then-write
removes the race without a transaction.

**Alternatives:** Reject over-stock adds (more code, worse outcome); clamp in
application code after a read (racy between concurrent requests).

**Trade-offs:** A shopper can ask for 3 and get 2 without an explicit error — the
stepper's disabled "+" and the "Only N in stock" line carry that instead.

**With more time:** Re-validate stock at checkout, since a cart can sit for days.

---

## D26 — Restoring focus waits for the transition, not a timer

**What:** When the add-to-cart drawer closes, focus returns to the button that
opened it — in an effect gated on `!pending`, not synchronously and not after a
`requestAnimationFrame`.

**Why:** Three versions of this were wrong, and each failed in a different way.
Storing the trigger element does not survive `router.refresh()`: React replaces
the node and focusing a detached one silently does nothing. Focusing
synchronously in the close handler happens before the re-render that removes the
drawer. A single `requestAnimationFrame` passed locally and failed under parallel
test load, because the refresh had not landed yet. Gating on the transition's own
`pending` flag is the only version that is actually deterministic.

**Alternatives:** A fixed `setTimeout` (hides the race on a fast machine);
skipping focus restoration (fails the keyboard criterion in D16).

**Trade-offs:** Focus returns a beat after the drawer closes, once the refresh
settles. Imperceptible, and correct.

**With more time:** `inert` on the background while the drawer is open, so the
trap is enforced by the platform rather than a Tab handler.

---

## D27 — The guest cart absorbs the user's cart on sign-in — **superseded by D30**

> **Superseded by D30.** Claiming the guest cart in place, cookie and all, let a
> signed-out visitor see the previous user's cart and let the next account
> inherit it. Kept here because the reasoning below is still why the merge takes
> the union rather than discarding either side.

**What:** Signing in folds any cart already owned by the account into the cart
the shopper is currently looking at, then claims that cart for the user. The
session cookie is untouched. Quantities sum and clamp to stock, the same as
adding does.

**Why:** The cart in front of you is the one you just filled; making it vanish
because an older cart existed on the account is the failure people actually
notice. Direction matters and only one direction is defensible.

**Alternatives:** Discarding the guest cart (loses what was just added);
discarding the user's cart (loses what was saved earlier); keeping both and
asking (a dialog nobody wants mid-checkout).

**Trade-offs:** An item in both carts ends up with the summed quantity, which
could surprise someone. Capping at stock keeps it from becoming absurd.

**With more time:** Say so — "we added 2 items from your saved cart" — rather
than silently merging.

---

## D28 — One sign-in error for both wrong password and unknown email

**What:** "That email and password do not match an account", whichever it was.
Sign-**up** errors are specific: which field, and why, including how short a
password was.

**Why:** Distinguishing the two on sign-in turns the form into an oracle for
which addresses have accounts. Sign-up has to reveal that an email is taken —
there is no way to register otherwise — so it does so plainly and points at
sign-in. Being vague there would just waste people's time.

**Alternatives:** Precise messages everywhere (leaks account existence); vague
messages everywhere (users cannot fix what they cannot see).

**Trade-offs:** Someone who mistypes their email gets a slightly unhelpful
message. The email is preserved in the form so the typo is visible.

**With more time:** Rate limiting on the sign-in route, which is the other half
of not being an oracle.

---

## D29 — Credentials are verified before calling `signIn`, and `trustHost` is on

**What:** `signInAction` looks the user up and runs `bcrypt.compare` itself,
then calls Auth.js `signIn` only on success, with `redirectTo`. The config sets
`trustHost: true`.

**Why:** Both were found the hard way. Across Auth.js v5 betas `signIn` variously
throws, returns a URL, or returns an object carrying `error`, and guessing wrong
means a failed sign-in silently redirects as though it succeeded — which is what
happened here. Verifying first is unambiguous and keeps the failure message ours
to word (D28). Separately, `signIn(..., { redirect: false })` did not persist the
session cookie at all in this beta, and without `trustHost` the credentials
callback dead-ended on `/api/auth/callback/credentials`.

**Alternatives:** Trusting `signIn`'s return shape (broke); hand-rolling sessions
(more control, but reimplements what Auth.js is here for, against CLAUDE.md).

**Trade-offs:** The password is compared twice on a successful sign-in — once by
us, once inside `authorize`. Two bcrypt calls on the one path where a person is
already waiting on a network round trip.

**With more time:** Pin a stable Auth.js release rather than a beta.

---

## D30 — A cart belongs to a session or to a user, never to both

**What:** `carts.session_token` and `carts.user_id` are mutually exclusive, and a
database `CHECK` constraint refuses any row that sets both or neither. Reads
resolve by user id when signed in and by session token **only when the cart is
unclaimed** otherwise. Sign-in folds the guest cart into the user's cart and
deletes the guest row; sign-out clears the cart cookie.

**Why:** This replaces D27, which was wrong. Claiming the guest cart in place —
setting `user_id` while keeping its `session_token` — left the browser holding a
cookie that still resolved to a cart now owned by someone. Found on the deployed
site: signing out left the header showing the previous user's items, and the
next account created in that browser inherited them. A shared or borrowed
computer would have leaked one person's cart to another.

The direction of the merge also flipped. D27 made the guest cart the target
because it is "the one in front of you"; but that cart has to survive sign-out,
and only a user-owned cart does. The user's cart is now the target and the guest
cart is consumed. The union of items is identical either way.

**Alternatives:** Keeping one nullable owner and filtering in application code
only (the original design — one missed query reintroduces the leak); deleting
the user's cart at sign-in (loses what they saved earlier).

**Trade-offs:** Two migrations carrying hand-written data repair, because rows
written by the buggy version had to be fixed before the constraints could hold.

**With more time:** The same exclusivity for orders and addresses, before they
are written rather than after.

---

## D31 — Checkout never collects card details, not even fake ones

**What:** The payment step offers one pre-selected method — "Demo card ending
4242", a string constant. There is no card number, expiry or CVC field anywhere
in the app, no payment SDK installed, and no processor keys in the environment.
A second option is shown disabled with its reason, mirroring how Amazon presents
an ineligible payment plan.

**Why:** A realistic-looking card form is the single thing most likely to make
someone type a *real* card number into a demo. The safest field is the one that
does not exist. It also costs less to build than a form we would have to
validate and then throw away, and Amazon's own step for a saved card is a
one-click confirmation anyway — so this is faithful, not a shortcut.

**Alternatives:** A fake card form with shape validation (looks more complete,
invites real card entry, and stores nothing anyway); a test-mode Stripe
integration (real keys, real PCI surface, hours of work, on the cut list).

**Trade-offs:** The payment step is the thinnest of the four. It is labelled as
a demo in three places so nobody mistakes it for a real checkout.

**With more time:** Stripe in test mode with their hosted element, so no card
data touches our code even then.

---

## D32 — Placing an order is one transaction over a second connection

**What:** `placeOrderAction` runs inside `txDb.transaction()`: re-read the cart,
lock the variant rows `FOR UPDATE`, verify stock, insert the order and its
snapshot lines, decrement stock, empty the cart. All of it or none of it. This
needs a WebSocket pool (`lib/db/pool.ts`) alongside the HTTP driver the rest of
the app uses.

**Why:** Every other write in this app is a single statement and safe on its
own. An order is six writes that must not half-happen — a decremented stock with
no order, or an order with a cart still full, is corruption a demo cannot
recover from. Neon's HTTP driver has no multi-statement transactions at all, so
the choice was a second connection or hand-rolled compensation logic.

The row lock matters as much as the transaction. A cart can sit for days and the
catalog moves underneath it, and two people buying the last unit at the same
moment is exactly the race `FOR UPDATE` exists for. Stock is re-checked inside
the lock, never before it.

**Alternatives:** One giant CTE statement (atomic, but unreadable and it cannot
return a useful "only 2 left" message); optimistic decrement with compensation
(more code, more failure modes).

**Trade-offs:** A second driver and connection pool to understand, used on
exactly one path. Node 22's global WebSocket means no `ws` package.

**With more time:** Reserve stock when the cart is created rather than at
checkout, which is what real stores do.

---

## D33 — The e2e suite mutates the catalog, and the seed is the reset

**What:** Order specs place real orders, which decrement real stock. Running the
suite against the deployed site drains the same catalog a reviewer browses.
`pnpm db:seed` restores stock, clears the demo cart and sweeps throwaway
accounts — **re-run it after any pass against production.**

**Why:** Found the hard way: 61 test orders left the first product in
`mobile-accessories` at zero stock, and 28 specs then failed because the fixture
they all reached for could no longer be added. The tests were not flaky; they
had eaten their own fixture.

Two fixes followed, both worth having on their own. Test helpers now pick a card
that can actually be added rather than blindly taking the first one. And the
product page now defaults to an **in-stock** variant when the URL specifies
none — landing on "Out of stock" while three other colours are available was a
worse first impression than it needed to be, whatever the tests do.

**Alternatives:** A separate test database (right answer, but it doubles the
provisioning and the deploy check would no longer exercise the real one); making
order specs roll back (they would stop testing the transaction).

**Trade-offs:** A manual re-seed step after production runs, which is easy to
forget. It is written into `PROGRESS.md` and this entry because of that.

**With more time:** A seeded test database per environment, so production stock
is never test data.

---

## D34 — No loading skeletons, because streaming costs more than it buys here

**What:** There are no `loading.tsx` files. Pages are server-rendered and arrive
whole.

**Why:** M7 added four of them, and each one broke something real.

A `loading.tsx` wraps its segment in Suspense, so Next streams the response and
flushes the `200` header before the page body runs. A later `notFound()` then
renders the right content with the **wrong status** — `/product/[slug]`,
`/category/[slug]` and `/orders/[id]` all silently started returning 200 for a
missing slug, which three existing specs caught.

Worse, streamed content arrives `hidden` and is revealed by inline script. With
JavaScript off the skeleton stays and the content never appears — so the
skeleton broke the no-JS path that search, filters and the cart are deliberately
built to support.

They also made tests racy in a way that was honest: counting results straight
after `goto` had always been a race, and the skeleton simply exposed it. Those
specs now wait for the result count before asserting, which is better testing
regardless.

Against all that, the benefit is a skeleton flash on pages that serve in
milliseconds from one or two queries over 84 products.

**Alternatives:** Skeletons only on routes that cannot 404 (that was the second
attempt — search survived it, then failed the no-JS spec); `<Suspense>` inside
the page around just the data-dependent part (same streaming semantics, same
no-JS problem).

**Trade-offs:** On a genuinely slow connection there is no progress indicator
between clicking and the page arriving. Next's own navigation indicator covers
some of that.

**With more time:** Partial prerendering, where the shell is static and only the
dynamic hole streams — which gets the skeleton without giving up the status code.

---

## D35 — Header tap targets are 44px

**What:** The logo, account and cart links in the header are at least 44px tall
on mobile. They were 28px.

**Why:** An audit across every page at 375px found exactly one systemic issue,
and this was it — the three most-tapped controls in the app were well under the
comfortable minimum.

The first fix introduced a subtler bug worth recording: making the logo anchor
`flex` to centre it turned `8x` and `<span>store</span>` into separate flex
items, and Chrome then computed the accessible name as **"8x store"** with a
space, breaking every `getByRole("link", { name: "8xstore" })` in the suite.
Padding achieves the same height without touching the name.

**Alternatives:** Inflating breadcrumb and in-sentence links too. Rejected —
those are exempt from the target-size guidance precisely because enlarging text
inside a sentence looks wrong, and M7 was scoped to real issues, not redesigns.

**Trade-offs:** A slightly taller header on mobile.

**With more time:** The same audit as an automated check in CI, rather than a
script run once.

---

## D36 — The frontend is redesigned as Almanac; the backend is untouched

**What:** 8x changed the brief from an Amazon clone to an original storefront
on the same backend. Three directions were proposed
(`docs/DESIGN-DIRECTIONS.md`); **Almanac** was chosen, with four amendments
from review: no schema change, modern rather than vintage, mono figures
borrowed from the Tally direction, and one neutral photo well across every
category. The system:

- **Type:** Instrument Serif for display only, Instrument Sans for reading and
  UI, Geist Mono for every number a shopper compares (prices, totals, counts,
  catalogue and order numbers, `--`). Fraunces, proposed in the direction doc,
  was swapped for Instrument Serif because it reads 1970s; the brief said
  modern.
- **Colour:** neutral page `#FAFAF8`, ink `#141413`, one clay accent `#C4411B`
  reserved for buying, crimson kept apart from clay for errors. Every text pair
  passes AA; ratios are computed live on `/design-system`.
- **Structure:** hairline rules instead of boxes and shadows, 2px corners, no
  drop shadows anywhere.
- **Photos:** the dummyjson shots are transparent 1000×1000 cut-outs, so every
  product sits on the same `well` colour with no blend-mode tricks.
- **Signature:** the catalogue number (D37) and the receipt — torn edge, dotted
  leaders, `--` on a leader — for the drawer and every total.

The pre-redesign token names (`ink-*`, `surface*`, `accent*`, …) were kept and
re-pointed, so every page adopted the new identity at once and no intermediate
deploy looked broken while pages were redesigned one at a time.

Every deliberate UX pattern survives with a new look: drawer not interstitial
(D8), title and price first on mobile (D9), cart summary on top on mobile,
checkout accordion with `--` (D11), no sponsored rows (D10).

**Tests changed, and why:** five assertions on the name `8xstore` now assert
`Almanac`, because the brand changed — what they check is unchanged. All other
copy the suite depends on ("Shop by category", "Top rated", "See options",
"Add to cart") was kept, so no other spec needed to move.

**Alternatives:** Tally (monochrome spec-sheet; cheapest, but reads generic) and
Ripe (colour-coded pastels; most QA surface, risks looking toy-like).

**Trade-offs:** A serif-led identity is less obviously "tech store" for laptops
and phones; mitigated by keeping product titles in the sans and numbers in mono.

**With more time:** A dark theme from the same tokens, and an automated axe
pass so the contrast claims are enforced rather than displayed.

---

## D37 — The catalogue number is read off the slug, not stored

**What:** Every product shows a number like `No. 078`. It is the dummyjson id
already at the end of every slug (`apple-macbook-pro-14-inch-space-grey-78`),
zero-padded, derived by `catalogueNo()` in `lib/format.ts` at render time.

**Why:** The brief said the backend stays untouched. The id is unique, fixed by
the seed, and already in every row the UI reads — a stable number with no
migration and no query change.

**Alternatives:** A `catalogue_no` column (a schema change, ruled out); numbering
by sort order at render (shifts whenever the catalogue changes).

**Trade-offs:** Numbers have gaps (the catalogue is 84 of dummyjson's 194) and
depend on a slug convention. A slug without the suffix renders no number rather
than a wrong one.

**With more time:** A real column, if the catalogue ever stops coming from one
seed source.

---

## D38 — The first screen always has a product; cards end in one aligned row

**What:** The home masthead carries one product — the best-rated item that is
in stock and has options — beside the headline on desktop and under the buttons
on mobile. Product cards reserve two title lines and end in the same price row
and one 40px action for every state: *Add to cart*, *See options →* (styled as
a button), or a dashed *Out of stock*. The rating moved up to the meta row so a
sale price never wraps at 375px.

**Why:** Review of the first redesign pass: a text-only first screen at 1280px
gave a shopper nothing to buy, and cards whose footers differed by state made
grid rows ragged. The pick rule skips the literal top-rated item because that is
an Amazon Echo, the wrong first impression for a store built not to look like
Amazon, and a product with options shows per-option pricing (D7) at a glance.

*See options* is not a second link: it sits under the card's stretched title
link, so it is clickable while each card stays one tab stop.

**Trade-offs:** The shelf below skips the pick to avoid showing it twice, so
"Top rated" starts from the second-best in-stock product with options.

---

## D39 — The add-to-cart drawer renders through a portal

**What:** `AddedDrawer` is rendered with `createPortal(…, document.body)`
instead of in place next to the button that opened it.

**Why:** Found in the R3 screenshots. The buttons that open the drawer sit
inside sticky elements — the mobile buy bar and, since R2, the desktop buying
column — and `position: sticky` creates a stacking context. Rendered in place,
the drawer's `z-50` only competed inside that context, so the sticky header
(`z-40`) painted over the drawer's top edge and its Close button. The old
mobile buy bar had the same trap; it was masked because the old drawer was a
short bottom sheet that never reached the header.

**Alternatives:** Raising the header's and bar's z-indices around it (fragile:
any future sticky ancestor reintroduces it); removing the sticky column
(worse layout to fix a rendering detail).

**Trade-offs:** None of substance. The drawer is only created after a click, so
`document` always exists; focus trap and focus return are unchanged and the
suite's focus specs pass as before.

---

## D40 — One checkout assertion is scoped to `main`; the test was ambiguous

**What:** In the end-to-end order spec, `page.getByText(/8X-/)` became
`page.getByRole("main").getByText(/8X-/)`.

**Why:** This is a test fix, and the reason is stated here as CLAUDE.md
requires. After an order is placed the app redirects to the order page, and
Next's route announcer (a visually hidden `aria-live` region) reads out the new
page title, `Order 8X-… · Almanac`. When the announcer fills in before the
assertion runs, the locator matches two elements and strict mode fails the
spec. It surfaced during R5 under parallel load; a single run passes. The same
race existed before the redesign — the old title was `Order 8X-… · 8xstore` —
it just had not been hit.

The assertion's intent is "the order number is shown on the page". The
announcer is correct product behaviour (it is what makes client navigation
audible), so the product is not wrong; the locator was matching something the
test never meant. Scoping to `main` says exactly what was meant, and weakens
nothing: the number must still be visible in the page body.

**Alternatives:** Dropping the number from the confirmation page's title
(changes the product to suit a locator); retries (hides a deterministic
ambiguity).
