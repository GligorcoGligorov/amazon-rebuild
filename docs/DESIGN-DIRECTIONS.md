# Design directions

**Status:** proposal, 2026-09-25. Nothing implemented. Pick one; the chosen
direction becomes a D-entry in `DECISIONS.md` and this file stays as the record
of what was considered.

**The brief change.** 8x no longer wants an Amazon clone. They want an original
storefront on the same backend. The schema, queries, Server Actions, auth, cart,
checkout and orders stay exactly as they are. Only the presentation layer
changes: `app/**/page.tsx` markup, `components/`, `globals.css` and fonts.

---

## What every direction keeps

These UX patterns were chosen on purpose, backed by research (see D8–D13). Each
direction gives them a new look but keeps what they do:

| Pattern | Decision | Must survive the redesign |
|---|---|---|
| Add to cart opens a drawer, never a page | D8 | Focus trap, Escape, focus return (D26), no-JS fallback |
| Price visible early on mobile, sticky buy bar | D9 | Title + price before large imagery at 375px |
| Cart summary + checkout button above items on mobile | M4 | Summary beside items at ≥1024px |
| Checkout: stripped layout, 4-step accordion | D11 | Step in the URL, collapsed steps with *Change* |
| `--` for totals that cannot be known yet | D11 | Two-stage resolution: tax, then shipping |
| No sponsored slots, no duplicate listings | D10 | — |
| Quantity stepper whose minus becomes trash at 1 | M4 | — |
| Everything works without JavaScript | M3–M6 | Animations are an enhancement only |
| 44px tap targets, visible focus everywhere | D16, D35 | — |

**Constraints that apply to all three:**

- **Product photos are dummyjson shots on white.** Putting them on a tinted
  surface either needs `mix-blend-mode: multiply`, which knocks out the white,
  or a white image well. Each direction says which one it uses.
- **Price and money rendering does not change.** Integer cents, formatted at the
  edge. Only the typography around the numbers changes.
- **Renaming the store touches the e2e suite.** `polish.spec.ts` and
  `home.spec.ts` assert on the name `8xstore`. The brand changed, so the
  assertion is genuinely out of date. Update it and record why, as CLAUDE.md
  requires. The demo account email (`demo@8xstore.dev`) can stay, since it is
  data, not branding.
- **D18's contrast assertions must still pass.** Every text/background pair
  below was checked against WCAG AA. Ratios are listed.

---

## Direction A — **Almanac**

> *A general store printed like a seasonal catalogue: every product numbered,
> every page set like print.*

### Identity

**Palette**

| Role | Hex | Notes |
|---|---|---|
| Paper (page) | `#F5F0E6` | Warm off-white, the whole site sits on it |
| Paper raised (cards, drawer) | `#FBF8F2` | |
| Ink | `#1C1A17` | 15.3:1 on paper |
| Ink muted | `#6B645A` | 5.1:1 on paper, for meta text |
| Rule | `#DDD5C7` | Hairlines, dividers |
| Clay (buy, accent) | `#B8452A` | White on clay 5.4:1; clay text on paper 4.7:1 |
| Moss (in stock, success) | `#3E5B3A` | 6.7:1 on paper |
| Danger | `#9E1B1B` | Kept separate from clay so "buy" never reads as "error" |

**Type.** *Fraunces* (display, variable, with the soft/wonk axes turned down)
for headings, product titles and the big prices. *Instrument Sans* for body,
UI and forms. Prices use Instrument Sans `tabular-nums` wherever numbers need
to line up in columns (cart, summary), and Fraunces only where a price stands
alone.

**Spacing and corners.** 8px base. Generous vertical rhythm: 56px between home
sections on mobile, 96px on desktop. Corners are almost square (2px). Structure
comes from 1px rules instead of shadows or boxes. No drop shadows anywhere.

**Images.** White product shots sit in a `#FBF8F2` well with
`mix-blend-mode: multiply`, so they look printed onto the page instead of pasted
on as white rectangles.

### Surfaces

- **Home.** A masthead with no hero image: the store name set large in Fraunces,
  a one-line edition note ("Autumn edition · 84 goods in 13 departments"), and
  the search box. Below it, departments appear as a typeset *index*: a ruled
  list with a department name, count and one small photo per row, like a
  catalogue's contents page. Then "Well regarded" (today's Top rated) as a
  horizontal row of numbered cards.
- **Product grid.** 2 columns at 375px, 4 at desktop. There are no card boxes:
  each product sits in its image well with the catalogue number
  (`No. 042`), the title in Fraunces and the price beneath, with rules between
  rows. Out-of-stock items show "Sold out" in small caps instead of a grey
  overlay.
- **Product page.** On mobile: number, then title, then price, then a short
  image strip (not full-viewport), then variants (D9). Variant chips are
  rectangles with a clay underline for the selected state and a strike-through
  for sold out, with a text label and not colour alone (D16). The description is
  set as an actual column of reading text. The sticky buy bar is a paper-coloured
  strip with a rule on top: price on the left, a clay *Add to basket* on the
  right.
- **Cart drawer.** Styled as a **receipt**: a narrow panel with a perforated
  (zig-zag) top edge, the item listed as a receipt line with dotted leaders
  running to the price, and *View basket* / *Checkout* below.
- **Checkout.** Four steps numbered I–IV in Fraunces. The collapsed-step summary
  line uses the same dotted-leader style. The order summary is a receipt block,
  so `--` sits on a dotted leader and reads like a line waiting to be filled in.

### Signature detail

**The catalogue number.** Every product gets a permanent number (`No. 042`)
that appears on its card, product page, cart line, receipt and order history.
It makes the store feel curated and makes orders easy to reference ("the
No. 042 jacket"). **Caveat:** product ids are UUIDs, so no such number exists
yet. Showing a real one takes a small committed migration (a `catalogue_no`
column filled by the seed). That is the only change in any of the three
directions that would touch the schema. Without it, the number would have to
come from sort order at render time, and it would shift if the catalogue
changed.

### Risk / trade-off

- **Boutique feel on a mixed catalogue.** Serif, cream and receipts suit
  clothing, bags and watches well, but laptops and smartphones may look out of
  place. Mitigation: product titles stay in the sans font inside dense
  lists, and Fraunces is used only for display.
- **Cream reduces perceived image sharpness.** The multiply blend fixes white
  edges, but some dummyjson shots have grey backgrounds that will look muddy.
- **Least "app-like" of the three.** It trades some scan speed for character.

---

## Direction B — **Tally**

> *A store with the precision of a spec sheet: black and white, one signal
> colour, numbers treated as the main content.*

### Identity

**Palette**

| Role | Hex | Notes |
|---|---|---|
| Page | `#FFFFFF` | Photos sit on it natively, with no blending needed |
| Ink | `#0A0A0A` | 19.8:1 |
| Ink muted | `#6B6B6B` | 5.3:1, for meta and labels |
| Hairline | `#E4E4E4` | The grid itself |
| Sunken | `#F5F5F5` | Summary panels, input backgrounds |
| Signal (buy, focus, active) | `#2B3BFF` | Ultramarine. White on it 6.6:1; as text 6.6:1 |
| Flag (stock warnings, sale) | `#FF5B1F` | Black on it 6.4:1, and only ever carries black text |
| Danger | `#D0021B` | |

**Type.** *Geist* for everything textual and *Geist Mono* for every number:
prices, quantities, counts, step numbers, order ids. It is one family with two
voices, both on Google Fonts. Headlines are big and tight (letter-spacing
−0.03em), and body text stays at 15–16px.

**Spacing and corners.** 4px base, with a strict 12-column grid on desktop and 4
columns on mobile. **Zero radius** everywhere. Structure comes from 1px
hairlines that form a visible grid: product cards share borders like cells in a
table. It is dense where density helps (lists, summaries) and has large empty
margins around headings.

**Images.** White on white with no treatment. The hairline cell is the frame.

### Surfaces

- **Home.** A single large typographic statement ("84 things, carefully
  chosen.") set at 64–96px, with the search field directly below as a full-width
  underlined input. Departments appear as a **table**: department name on the
  left, a mono item count and "from $X" on the right, and a thumbnail that
  appears on hover or focus on desktop. Top rated follows as a hairline grid.
- **Product grid.** Cells in a shared hairline grid (2 up on mobile, 4 on
  desktop). Each cell shows the image, title and a mono **index line** below:
  `$24.99 · 6 options · in stock`. Filter chips are rectangular toggles, and the
  result count is set large in mono ("37 results").
- **Product page.** On mobile, the title and a large mono price come first
  (D9). Variants are a segmented control, a row of square cells sharing
  borders, with a signal-blue fill for the selected option and a diagonal hatch
  for sold out. Below the description sits a **spec table** (category, options,
  stock, SKU) built from data we already have. The sticky buy bar is black,
  with the mono price in white and a signal-blue *Add* button.
- **Cart drawer.** It slides in from the right as a full-height black panel with
  white type, the only inverted surface in the store. The top shows the tally:
  items and subtotal in large mono. The added line sits below with the two
  actions.
- **Checkout.** Steps are labelled `01 / 04` through `04 / 04`, with a thin
  progress rule across the top that fills as steps complete. The summary is a
  two-column mono table where `--` is simply what an empty cell looks like in
  that typeface, so the honest placeholder looks deliberate instead of broken.

### Signature detail

**Numbers that count.** When the subtotal, cart badge or checkout total changes,
the mono digits roll to the new value (a short per-digit vertical slide,
disabled under `prefers-reduced-motion` and absent without JS). Paired with
Geist Mono everywhere, it makes the store feel precise and alive at the exact
moments money changes.

### Risk / trade-off

- **Can feel cold, or like a developer tool.** Black, white and mono lean
  technical. It suits the laptops, phones and watches in the catalogue, but less
  so the dresses and beauty products. Mitigation: large photography and generous
  margins around the dense bits.
- **Minimal is easy to do badly.** It depends on exact alignment. A
  hairline one pixel off is visible, so every page needs the grid respected at
  both widths.
- **Least distinctive at a glance.** Many modern stores use a monochrome Swiss
  style. What sets it apart is the numbers treatment, so that must be done
  fully, not halfway.

---

## Direction C — **Ripe**

> *A friendly, colour-coded store: every department has its own colour, and
> that colour follows you through the site.*

### Identity

**Palette**

| Role | Hex | Notes |
|---|---|---|
| Page | `#FFFBF5` | Barely-warm white |
| Ink | `#211E1A` | 16.1:1 |
| Ink muted | `#6A635B` | 5.7:1 |
| Buy (button fill) | `#211E1A` | Ink pill with white text, 16.6:1 |
| Tomato (badge, accent, focus) | `#FF6B4A` | Carries ink text only, 5.9:1 |
| Tomato text | `#C2361F` | When the accent must be text, 5.3:1 |
| Department tints | `#FFD9C7` peach · `#D6E6FF` sky · `#DDF0D0` mint · `#EEDCFF` lilac · `#FFEFA8` butter · `#CDEFEA` aqua | Ink on each ≥ 12.6:1 |

The 13 categories map onto the 6 tints deliberately, by kind (apparel is peach,
devices are sky, accessories are aqua, and so on), not by cycling, so the same
colour means the same kind of thing.

**Type.** *Bricolage Grotesque* for display: characterful, with a slightly
quirky width axis, used big and bold. *Figtree* for body and UI, which is round,
friendly and very legible at small sizes. Prices appear in Bricolage at display
sizes.

**Spacing and corners.** 8px base with a lot of air. Cards use a 24px radius,
buttons and chips are full pills, and the drawer has a 28px top-left radius.
There are no borders and no shadows: surfaces are separated by colour fields.

**Images.** Photos sit on the department tint with `mix-blend-mode: multiply`,
so a white-background shoe appears to stand on peach.

### Surfaces

- **Home.** A short, bold greeting headline and the search field as a large
  pill. Then departments appear as **big colour blocks**, a 2-column grid on
  mobile, each tile its tint with a cut-out product photo and the name in
  Bricolage. Top rated is a swipeable row of tinted cards.
- **Product grid.** Rounded cards, each tinted by its department, so a search
  across categories produces a mixed colour grid and a single category page is a
  calm single-colour page. The price is always on the card at 375px (D9's
  principle, applied to the grid).
- **Product page.** The image stage takes the department tint, and the title
  and price sit above it on mobile (D9). Variant options are pills, with the
  selected pill filled in ink and sold-out pills dashed and struck through,
  labelled in text. The sticky buy bar is a floating ink pill with price and
  *Add to bag*, inset 12px from the screen edges.
- **Cart drawer.** A bottom sheet on mobile (thumb-reachable) and a right
  drawer on desktop. The header strip takes the tint of the item just added,
  with a large "In your bag" and the item on its colour.
- **Checkout.** Each step is a rounded card. Completed cards collapse into
  mint-tinted pills with a check and *Change*. The order summary uses a soft
  sunken card, and `--` is rendered as a small grey pill reading "after
  address", which states *why* it's unknown, not just that it is.

### Signature detail

**Colour that follows you.** The department tint moves with the shopper: from
home tile, to grid card, to product image stage, to the drawer header, to the
cart line thumbnail and the order-history line. Where you are, and what kind of
thing you're buying, is always visible without reading. It is one CSS custom
property set per category, so it costs no extra data.

### Risk / trade-off

- **Playful can look cheap.** Pastels and pills are the house style of many
  D2C brands. The difference between tasteful and toy-like here is restraint:
  one tint per surface, never two side by side except on the home grid.
- **Most CSS and QA work.** Six tints × every surface × two widths, plus a bottom
  sheet that differs from the desktop drawer. The bottom sheet also has to keep
  the D26 focus behaviour intact.
- **Dark photography on tints.** Multiply works well on white shots but
  darkens photos that aren't pure white. A few dummyjson products will look
  muddy on sky or lilac.

---

## Side by side

| | A — Almanac | B — Tally | C — Ripe |
|---|---|---|---|
| Feel | Editorial, warm, curated | Precise, confident, modern | Friendly, bright, energetic |
| Best-fit catalogue | Apparel, bags, watches | Devices, accessories | Broad, mixed |
| Memorable detail | Catalogue numbers + receipt drawer | Rolling mono numbers | Department colour that follows you |
| Build effort | Medium | **Lowest** (white, square, one font family) | Highest (tints, bottom sheet) |
| Main risk | Boutique mismatch with electronics | Can read as cold or generic | Can read as toy-like |
| Photo handling | Multiply on cream | None needed | Multiply on tints |

## Recommendation

**B (Tally) for the lowest risk, A (Almanac) for the most distinct identity.**
Tally is the cheapest to ship without breaking the flow, and its mono treatment
of `--` and totals makes the honest-checkout decision the store's visual
signature. Almanac is the one nobody would mistake for Amazon or for a template.
Ripe is the most fun but carries the most QA surface. Final call is yours.
