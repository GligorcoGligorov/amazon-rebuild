# Progress

Handoff note. Rewritten at the end of every milestone. If you are a fresh
session, this plus `CLAUDE.md` and `docs/DECISIONS.md` is everything you need.

**Last updated:** 2026-09-22

---

## Current milestone

**M0 — Foundations.** Project context, standing rules, and handoff docs, so any
session can pick up cold. No application code yet.

## Done

- Automatic prompt/response capture into `.agent-logs/` via Claude Code hooks
  (`UserPromptSubmit` + `Stop`). Verified working across sessions — see
  `CAPTURE-TEST.md`.
- `CLAUDE.md` — project context, stack, conventions, standing rules.
- `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md` created.

## In progress

Nothing. M0 is closed.

## Known bugs

None — there is no application code yet.

## Next steps

Milestone plan, in intended order. Each is a vertical slice that is shippable on
its own; each ends with typecheck + lint + build + e2e per `CLAUDE.md`.

1. **M1 — Scaffold + deploy.** Next.js App Router + TypeScript + Tailwind,
   Neon database provisioned, Drizzle wired up, Playwright configured, deployed
   to Vercel. Exit: a deployed page that reads one row from the database, and
   one e2e spec that loads it at 375px and 1280px.
2. **M2 — Catalog.** Product schema + seed data, home/browse grid, product
   detail page. Exit: browse → product detail works on mobile and desktop.
3. **M3 — Search + filter.** Search by title, category filter, sort. Exit: a
   user can find a specific product from the home page.
4. **M4 — Cart.** Add, update quantity, remove; persists across reload. Exit:
   full add-to-cart flow tested at both widths.
5. **M5 — Auth.** Auth.js credentials, sign up / sign in / sign out, cart
   survives sign-in. Exit: auth flow tested at both widths.
6. **M6 — Checkout + orders.** Address + fake payment, order placement, order
   history. Exit: the whole browse → checkout → order flow tested end to end.
7. **M7 — Polish.** Loading and empty states, error boundaries, responsive
   pass, accessibility pass, final deploy.

Cut list (deliberate, not forgotten): real payments, reviews, recommendations,
seller accounts, image upload, inventory management. See `docs/DECISIONS.md`.

## Open questions

- None blocking. Neon database and Vercel project are not yet provisioned — that
  is the first task of M1.
