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
