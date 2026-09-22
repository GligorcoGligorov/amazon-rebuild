# CLAUDE.md

## Start here, every session

Before doing anything else, read in this order:

1. `CLAUDE.md` (this file) — rules and stack
2. `docs/PROGRESS.md` — where we are, what's next
3. `docs/DECISIONS.md` — why things are the way they are

Do not start work until you've read all three. They are the handoff.

## The project

A rebuild of the core Amazon shopping experience, built in a 24-hour window for
an 8x assignment. It is judged on three things, in this order:

1. **A shipped, working product.** Deployed, reachable, and it does what it says.
   A broken feature is worth less than a missing one.
2. **Product judgement.** What got built and what got cut, and whether the cuts
   were the right ones for a 24h budget. Depth over breadth: a complete
   browse → search → cart → checkout → order flow beats twelve half-features.
3. **UX/UI.** It should feel like a real store, not a CRUD demo. Mobile first.

Implication for how to work: at every point there should be a deployed thing
that works. Build in vertical slices that are shippable on their own; never
leave the tree in a state where the main flow is broken.

## Stack

| Area | Choice |
|---|---|
| Framework | Next.js (App Router), React Server Components by default |
| Language | TypeScript, strict |
| Styling | Tailwind CSS |
| Database | Postgres on Neon |
| ORM / migrations | Drizzle + drizzle-kit |
| Auth | Auth.js (NextAuth), credentials provider |
| E2E tests | Playwright |
| Hosting | Vercel |

## Conventions

- **Server Components by default.** `"use client"` only for actual interactivity
  (cart controls, search-as-you-type, forms with local state). Push it to leaves.
- **Mutations are Server Actions**, not route handlers, unless something external
  needs an HTTP endpoint.
- **Data access lives in `lib/db/queries/`.** Components never import `db`
  directly; they call a named query function. Keeps the data model one grep away.
- **Money is integer cents**, never a float. Format only at the render edge.
- **Schema changes go through a drizzle-kit migration** that is committed. No
  hand-edited SQL against the deployed database.
- **Secrets stay in `.env.local`** (git-ignored) and in the Vercel project. Never
  commit them, never paste them into docs or logs.
- Tailwind utilities inline; extract a component when a pattern repeats a third
  time, not the first.
- File naming: `kebab-case` for files and routes, `PascalCase` for components.
- Keep it concise. Comments explain *why*, not *what*.

## Standing rules

### Definition of done for a milestone

A milestone is done only when all four pass, in this order:

```
pnpm typecheck && pnpm lint && pnpm build && pnpm test:e2e
```

Then two more, every milestone — not just the first and last:

- **Deployed to Vercel, and the live URL opened and checked by hand.** A green
  local build is not a deploy. There must be a working public link at every point
  in the build, so running out of time still leaves something shipped. (`D15`)
- **The features this milestone shipped are keyboard-operable and correct at
  375px.** Accessibility and responsive behaviour belong to the slice that
  introduces them. M7 is a final pass over finished work, not a cleanup of
  deferred debt. (`D16`)

Do not mark a milestone done, and do not commit it, until all of them pass.

**When a test fails, fix the cause, not the test.** Do not weaken an assertion,
add a wait to paper over a race, skip a spec, or narrow a selector until it
passes. If the test is genuinely wrong, say so explicitly in the commit message
and in `docs/DECISIONS.md` — but the default assumption is that the product is
wrong, not the test.

### What the E2E tests cover

Playwright specs test **real user flows end to end**, not units. Each milestone
adds specs for the flows that milestone introduced. Every flow spec runs at both:

- **mobile — 375px wide** (primary; this is the judged experience)
- **desktop — 1280px wide**

A spec drives the UI the way a person would: click the real controls, read the
real rendered text, assert on what the user sees. No testing of internal
functions, no snapshot-only specs, no "it renders without crashing".

### After each milestone

1. Update `docs/PROGRESS.md` — current milestone, done, in progress, known bugs,
   next steps. Write it for someone with no memory of this session.
2. Add entries to `docs/DECISIONS.md` for anything significant decided.
3. Update `docs/ARCHITECTURE.md` if the data model, structure, or flows changed.
4. Commit the code **together with `.agent-logs/`** in the same commit. The logs
   are part of the submission and must track the code they produced.

### Commits

One commit per milestone unless something big lands mid-milestone. Message:
short imperative subject, then a few lines on what shipped and what's deferred.
End with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

### Scope discipline

If something is going to take longer than its slice of the 24h budget, cut it
and write down the cut in `docs/DECISIONS.md` under "what I'd do with more
time". A deliberate, documented cut is product judgement. An undocumented
half-built feature is a bug.
