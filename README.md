# 8xstore — Amazon rebuild

A rebuild of the core Amazon shopping experience: browse → search → product →
cart → checkout → order. Built in a 24-hour window for an 8x assignment.

**Live: https://8x-store.vercel.app**

## Running it

```bash
pnpm install
cp .env.local.example .env.local   # then fill in DATABASE_URL from Neon
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test:e2e
```

E2E specs run at 375px and 1280px. To run them against the deployed site:

```bash
E2E_BASE_URL=https://8x-store.vercel.app pnpm test:e2e
```

## Where things are

| Path | What |
|---|---|
| `CLAUDE.md` | Stack, conventions, standing rules |
| `docs/PROGRESS.md` | Current state, milestone plan, what's next |
| `docs/DECISIONS.md` | Why things are the way they are |
| `docs/ARCHITECTURE.md` | Data model, structure, flows |
| `research/FINDINGS.md` | The Amazon research the plan is built on |
| `lib/db/queries/` | All reads. Components call these, never `db` directly |
| `e2e/` | Playwright flow specs |
