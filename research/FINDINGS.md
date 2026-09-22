# Amazon research — findings

Input to the build. Read this before M2 (catalog) and again before M6 (checkout).
Everything below is observed on amazon.com on 2026-09-22, not recalled.

**Method.** Logged-out flows driven with Playwright and captured to
`research/auto/` (44 shots, `desktop-*` at 1280px, `mobile-*` at 375px). No
account was created, nothing was signed into, no CAPTCHA was encountered. The
only state changed was the guest delivery ZIP (→ 10001), which Amazon allows
without an account and which the buy box requires. Signed-in flows are the
manual captures in `research/manual/` (01–08), reviewed but not re-driven.

**One structural caveat.** Amazon has no responsive site. It switches templates
on user agent. A desktop browser at a 375px viewport gets the *desktop* template
with no `<meta name="viewport">` at all — 1000px of content in a 375px window,
horizontally scrolling. The real mobile site is a separate template and needed a
mobile UA to reach. So "mobile Amazon" and "narrow desktop Amazon" are different
products. Ours will be one responsive app; don't read their desktop CSS as
something that shrinks.

---

## Logged-out flows, step by step

### 1. Home

Desktop is a 4-up card grid of merchandising tiles over a hero carousel —
category shortcuts ("Shop kitchen must-haves"), each linking into a *search*
URL, not a category page. 4,175px tall. Mobile is the same idea at 2,356px:
edge-peeking hero carousel, then stacked deal shelves with countdown timers
("Ends in 07:17:53").

There is no product grid on the home page at all. Home is pure navigation.

An interstitial fires on first load — "We're showing you items that ship to
North Macedonia… Dismiss / Change Address" — before you've done anything.

`desktop-01`, `desktop-02`, `mobile-01`, `mobile-02`

### 2. Header, nav, category menu

Desktop header packs eight things into one bar: logo, deliver-to, search with a
department `<select>` (22 departments), language, account, orders, cart. Below
it a second nav row, and on some pages a third (department subnav) and a fourth
(promo strip) — four stacked bars before any content.

The category menu is a left slide-out drawer, not a mega-menu: grouped headings
(Digital Content & Devices / Shop by Department / Programs & Features / Help &
Settings), each row drilling down one level into a second panel with a "MAIN
MENU" back link. Mobile uses the same drawer pattern, reached from a hamburger.

Cart count is a badge on the cart icon in both layouts.

`desktop-03`, `desktop-04`, `mobile-04`

### 3. Search suggestions

Type-ahead fires per keystroke. Desktop shows 11 rows, mobile 7. Each row has a
product thumbnail and bolds the *completion* rather than the match — you type
"running shoes", it shows "running shoes **for men**". The last row is a scoped
refinement ("running shoes for men *from Top Brands*"). Mobile adds a clear (×)
in the field.

Thumbnails on suggestions are the detail that makes it feel like a store rather
than an autocomplete.

`desktop-05`, `mobile-05`

### 4. Search results

Desktop: a left filter rail with 22 groups (Gender, Brands, Customer Reviews,
Price with both preset bands and a min/max, Deals, Color, four separate shoe-size
scales, Arch Type, Seller, Seasons, Water Resistance…), a sort `<select>` with six
options (Featured, Price ↑, Price ↓, Avg. Customer Review, Newest Arrivals, Best
Sellers), and a 4-across card grid. 60 cards rendered, header says "1-48 of over
30,000 results".

Mobile drops the rail entirely for two horizontally-scrolling chip rows plus an
"All Filters" icon that opens a **full-screen filter sheet**: category list down
the left, pill options on the right, and a sticky `Show 10,000+ results` button
at the bottom that updates its count live. 26 cards in a 2-across grid, and no
result count shown at all.

Filters and sort are plain URL state and compose — `?k=running+shoes` +
`rh=p_123%3A198664` + `s=price-asc-rank`, each a full navigation. Back button
and sharing both work correctly as a result.

Pagination is numbered (Previous 1 2 3 … 7 Next) and **caps at 7 pages** — about
336 of those "30,000 results" are actually reachable.

Card content: image, Sponsored/Best Seller/Overall Pick/Amazon's Choice badge,
title, rating + review count, "50+ bought in past month", price with strikethrough
list price, delivery date, and either `Add to cart` or `See options` depending on
whether the product has variants. That last distinction matters for us — a
variant product cannot be added from the grid.

`desktop-06` … `desktop-10`, `mobile-06`, `mobile-07`, `mobile-08`

### 5. Category page

Not a product grid. `/electronics-store/b/?node=172282` is a merchandising
landing page: department rail on the left with subcategories and a few brand
checkboxes, a "Shop by Category" carousel, a full-width ad, then stacked deal
carousels. 9,058px on mobile.

The actual filterable grid only exists on `/s`. Categories funnel into search.
This is a deliberate split and worth copying in spirit — but at our scale one
page can do both.

`desktop-11`, `desktop-12`, `mobile-09`, `mobile-10`

### 6. Product pages

Three examined: a 6-pack t-shirt with colour+size variants (unbuyable at the
default location), the same brand's 7-pack with colour+size that *is* buyable,
and Amazon Basics batteries with pack-size variants.

Desktop layout is three columns: thumbnail rail + main image | title, rating,
price, variants | buy box card. Same ASIN measured both ways:

| | desktop 1280px | mobile 375px |
|---|---|---|
| page height | 12,497px | 16,176px |
| price at | y=398 | below the fold |
| Add to cart at | y=815 | y=1,769 |

On desktop price and Add to cart are both within the first screen. On mobile a
sponsored ad sits *above* the product title, and the price sits below a
full-viewport product image — you scroll past a screen of photo to find out what
it costs, and nearly 1,800px to buy it. There is no sticky add-to-cart bar.

Variant handling is the part worth stealing. Colour swatches each carry their
own price (`$23.12`, `$23.98 ($4.00/count)`, `$61.61 ($5.13/pack)`), so you can
see the cost of switching before you switch. Size buttons render in three states:
selected (solid outline), available (plain), and unavailable-at-this-location
(dotted border) — never hidden, so the range stays legible.

Buy box, top to bottom: Prime upsell card, one-time-purchase radio, price,
delivery promise with a real date, a "order within 9 hrs 22 mins" countdown,
`Deliver to New York 10001`, `In Stock`, quantity `<select>`, `Add to cart`,
`Buy Now`, then a Shipper/Returns/Payment table and a Subscribe & Save radio.

When an item can't ship to the selected location, the whole buy box is replaced
by `See Similar Items` / `See All Buying Options` — no price, no cart button.

`desktop-13` … `desktop-17`, `desktop-20`, `mobile-11`, `mobile-12`

### 7. Add to cart (guest)

Works fully logged out; the cart persists on a session cookie.

Adding does **not** open a drawer. It navigates to a full interstitial page.
Desktop gives you: confirmation with the chosen Size/Color, a free-shipping gap
nudge ("Add $11.88 of eligible items…"), cart subtotal, `Proceed to checkout
(1 item)`, `Go to Cart`, a soft "sign in to your account" prompt, a right-hand
cart drawer with a quantity stepper — and then two sponsored carousels and a
credit-card upsell.

Mobile is worse: `Go to Cart` only. No checkout button anywhere on the page. The
first thing below the confirmation is a sponsored carousel.

`desktop-18`, `desktop-19`, `mobile-13`

### 8. Cart

The clearest layout difference in the whole site, and mobile wins.

**Desktop**: line items left, sticky summary card right. Each line has image,
title, badges, `In Stock`, delivery date, FREE Returns, a gift checkbox, the
chosen variant attributes spelled out ("Size: Large", "Color: Black - 7 Pack"),
a quantity stepper, and Delete / Save for later / Compare / Share. The stepper
shows a **trash icon in place of the minus at quantity 1** — decrementing and
removing are the same gesture. Quantity changes update subtotal and the header
badge in place, no reload.

**Mobile**: subtotal, free-delivery status, and a full-width `Proceed to
checkout (2 items)` all sit **above** the line items. Everything needed to
decide is in the first viewport; the items are supporting detail below.

`desktop-21`, `desktop-22`, `desktop-23`, `mobile-14`, `mobile-15`

### 9. Where the wall is

Browse, search, product pages, add-to-cart and the entire cart are open to
guests. The wall sits at exactly two places: **checkout** and **orders**.

Hitting it strips all chrome — no header, no nav, no cart — and shows a single
centred card: "Sign in or create account", one field ("Enter mobile number or
email"), `Continue`. Identifier-first: one entry point for both sign-in and
sign-up, branching after the email is known. The `return_to` query param carries
the checkout destination, so the cart survives the round trip.

There is no guest checkout.

`desktop-24`, `desktop-25`, `mobile-16`

---

## Signed-in flows (from `research/manual/`)

### 10. Sign in / create account

Same stripped card as the wall. Below the fold: "Buying for work? Create a free
business account", which forks to a wholly separate Amazon Business signup with
its own header, blue (not yellow) buttons, and a 3-step progress indicator
(ACCOUNT CREATION → BUSINESS DETAILS → FINISH). Two different design systems
one click apart.

`manual/01`, `manual/02`

### 11. Account hub

Twelve icon cards in a 3-across grid — Your Orders, Login & security, Prime,
Your Addresses, Your business account, Gift cards, Your Payments, Amazon Family,
Digital Services, Your Lists, Customer Service, Your Messages — and then roughly
ninety text links in seven dense columns underneath.

The card grid is a good pattern. The link dump below it is where the page stops
being designed. Note that "Your Orders" is deliberately card #1: it is what
people actually come here for.

`manual/04`

### 12. Orders

Breadcrumb (Your Account › Your Orders), H1, a search-all-orders box, tabs
(Orders / Buy Again / Not Yet Shipped / Digital Orders / Amazon Pay), and a
time-range `<select>` reading "**0 orders** placed in [past 3 months ▾]".

The empty state is one sentence with a way out — "Looks like you haven't placed
an order in the last 3 months. **View orders in 2026**" — which correctly treats
"empty" as "possibly filtered", not "nothing exists". Then it puts a sponsored
product directly underneath.

`manual/05`

### 13. Cart, signed in

Same as the guest cart plus one addition: a **per-item checkbox** and a
"Deselect all items" link, with the subtotal reflecting only selected items. So
signed-in users can park things in the cart without them entering the order.

The empty state is genuinely well written — "Your Shopping Cart lives to serve.
Give it purpose — fill it with groceries, clothing, household supplies,
electronics, and more" — with three exits (homepage, today's deals, Wish List)
and a "Your Items / No items saved for later / Buy it again" panel below.

`manual/03`, `manual/06`

### 14. Checkout

This is the part to copy most closely.

Chrome is gone: the header is the logo, "Secure checkout", and a cart icon. No
search, no nav. Nothing to click but the flow.

The body is a **three-step accordion, one step open at a time**:
`Add delivery or pickup address` → `Payment method` → `Review items and
shipping`. Completed steps collapse to a one-line summary with a `Change` link —
at the payment step the address has folded down to "Delivering to Amazon Locker -
Tale / Giant Eagle 6299, 290 East Aurora Road, Northfield, OH, 44067".

An order-summary panel is pinned above it all: Items / Shipping & handling /
Estimated tax to be collected / **Order total**. Before an address exists the
breakdown lines read `--` and the total shows items only ($2.89); once the
address is set the total becomes $10.55. Shipping and tax are genuinely
unknowable until you know where it's going, and the UI says so rather than
guessing. (Though the breakdown lines still read `--` even after the total
updates, which looks like a defect.)

Payment options are grouped (available balance / credit and debit cards /
payment plans / other), and an unavailable option is **shown but disabled with
its reason attached**: "Pay over time with Affirm — Ineligible for this order.
Cart total is less than the minimum eligible amount." The step's CTA appears at
both the top and bottom of the section, disabled until a method is chosen.

A `Back to cart` link is always present. Legal copy states plainly that the
contract forms on shipping confirmation, not on clicking Place your order.

`manual/07`, `manual/08`

---

## What Amazon does well

1. **The wall is late and narrow.** Everything up to and including the cart is
   open. You only have to commit at checkout. This is the single biggest reason
   the funnel works, and it's free for us to copy.
2. **Checkout is a walled garden.** No nav, no search, one step open at a time,
   completed steps collapsed to an editable summary. Nothing competes with
   finishing.
3. **Mobile cart puts the decision above the items.** Subtotal, delivery status,
   and checkout button first.
4. **Prices are never abstract.** Per-unit pricing ($0.38/count), per-variant
   prices on the swatches themselves, strikethrough list price with a percentage,
   real delivery dates rather than "3–5 business days".
5. **Unavailable is shown, not hidden.** Dotted-border size buttons, a disabled
   Affirm option carrying its own reason. The user learns the shape of what's
   possible.
6. **Filter and sort live in the URL.** Shareable, back-button-correct, and
   trivial to server-render.
7. **The quantity stepper collapses to a trash icon at 1.** Decrement and remove
   are one control.
8. **Empty states have exits.** The empty cart and the empty orders list both
   offer somewhere to go, and orders correctly suggests the filter may be why.

## What's frustrating or cluttered

1. **Ad density.** 12 of 60 desktop result cards are Sponsored (20%), 6 of 26 on
   mobile (23%), plus banner ads above results, a sponsored product in the PDP
   right rail, two sponsored carousels on the add-to-cart page, and an ad in the
   *empty orders* state.
2. **Duplicate listings.** The same ASIN appeared twice in one result page (once
   sponsored, once organic), and two near-identical adidas listings at $148.50
   and $149.95.
3. **Product pages are enormous** — 12,497px desktop, 16,176px mobile for the
   same item — and mobile buries the price below a full-screen image with a
   sponsored ad above the title.
4. **Add-to-cart is a full page of upsell**, and on mobile it forgets to offer
   checkout at all.
5. **Four stacked nav bars** on some desktop pages before any content.
6. **Pagination caps at 7 pages** while claiming 30,000 results.
7. **Opaque titles and state.** Filtering by brand sets the page title to
   "Amazon.com: Running Shoes - 198664". Applied filters show only as a checked
   box in the rail plus a small "Clear" — no summary of what's active.
8. **The account page degrades into ~90 links** in seven columns.
9. **The location interstitial fires before any interaction.**

---

## What matters most for a 24h rebuild

Ranked. The top four are the product; below that is polish.

**1. The spine must work end to end.** browse → search → product → cart → sign in
→ checkout → order. Amazon's own funnel is guest-open up to the cart and gated
only at checkout, which is exactly the milestone order already in
`docs/PROGRESS.md` (M5 auth before M6 checkout). No change needed — this
research confirms the plan rather than redirecting it.

**2. Copy the checkout shape (M6).** Stripped chrome, three-step accordion,
completed steps collapsing to a summary with `Change`, order-summary panel
pinned above, `Back to cart` always present. This is the highest-value thing in
the whole study and it is cheap: three server-rendered steps and a summary
component. Show shipping/tax as `--` until an address exists rather than faking
a number.

**3. Copy the mobile cart layout (M4).** Summary + checkout button above the
line items at 375px, beside them at 1280px. Quantity stepper that turns into a
trash icon at 1. Variant attributes spelled out on each line.

**4. Get variants right on the product page (M2).** Price on each swatch,
three-state size buttons (selected / available / unavailable), and — the thing
that decides our schema — a variant product must not be addable from a grid
card. Plan on `products` → `variants`, with price and stock on the variant, not
the product. Getting this wrong at M2 is expensive to unpick at M4.

**5. Filters and sort as URL state (M3).** `?q=&category=&sort=` server-rendered,
no client filter state. Back button and sharing work for free, and it costs less
code than the alternative.

**6. Beat them where it's cheap.** Three near-free wins: make add-to-cart a
drawer or an inline confirmation instead of a full page interstitial and always
offer checkout from it; keep the product page short enough that price and Add to
cart are above the fold at 375px (or add the sticky bar Amazon lacks); show
applied filters as removable chips with a visible count.

**7. Steal the mobile filter sheet (M3, if time).** Full-screen overlay with a
live-counting "Show N results" button is a genuinely good pattern, but it is the
first thing to cut — a simple `<details>` panel is fine at this scale.

### Deliberately not copying

Sponsored placements, recommendation carousels, Prime upsells, Subscribe & Save,
gift options, Save for later, wish lists, business accounts, per-item cart
checkboxes, pickup locations. All of these are Amazon solving problems of scale
we don't have. Cutting them is the product judgement the assignment is asking
for — recorded here and in `docs/DECISIONS.md` rather than half-built.

---

## Screenshot index

`research/auto/` — captured this session, logged out.

| Flow | Desktop 1280px | Mobile 375px |
|---|---|---|
| Home | `desktop-01`, `desktop-02` | `mobile-01`, `mobile-02` |
| Category menu | `desktop-03`, `desktop-04` | `mobile-04` |
| Search suggestions | `desktop-05` | `mobile-05` |
| Search results | `desktop-06`, `desktop-07` | `mobile-06`, `mobile-07` |
| Pagination | `desktop-08` | — |
| Filter / sort applied | `desktop-09`, `desktop-10` | `mobile-08` |
| Category page | `desktop-11`, `desktop-12` | `mobile-09`, `mobile-10` |
| Delivery location | `desktop-15` | `mobile-03`, `mobile-03b` |
| Product, variants | `desktop-13`, `desktop-14`, `desktop-16`, `desktop-17` | `mobile-11`, `mobile-11b`, `mobile-12` |
| Product, simple | `desktop-20` | — |
| Add to cart | `desktop-18`, `desktop-19` | `mobile-13`, `mobile-13b` |
| Cart | `desktop-21`, `desktop-22`, `desktop-23` | `mobile-14`, `mobile-15` |
| Auth wall | `desktop-24`, `desktop-25` | `mobile-16` |

`research/manual/` — captured by hand, signed in.

| | |
|---|---|
| `01-signin-or-create-account` | the wall itself |
| `02-business-account-signup` | the business fork |
| `03-cart-empty-signed-in` | empty cart copy and exits |
| `04-account` | account hub |
| `05-orders-empty` | orders, empty state, time filter |
| `06-cart-with-item` | cart with per-item selection |
| `07-checkout-address` | checkout step 1, totals unresolved |
| `08-checkout-payment` | checkout step 2, address collapsed |
