# Celva

Monorepo for **Celva Store** — bilingual (FR/EN) e-commerce platform for Cameroon.

## Stack

| App | Path | Tech | Domain |
|-----|------|------|--------|
| Storefront | `apps/storefront` | Next.js (App Router) | celva.store |
| Admin | `apps/admin` | React-Admin | admin.celva.store |
| Delivery (Phase 4) | `apps/delivery` | React + Vite PWA | livraison.celva.store |
| API | `apps/api` | NestJS + Prisma | api.celva.store |

Shared code under `packages/`:

- `@celva/shared` — enums, types, constants mirroring schema v4
- `@celva/typescript-config` — `tsconfig` presets (`base`, `nestjs`, `nextjs`, `react-library`, `vite`)
- `@celva/eslint-config` — flat-config presets (`base`, `next`, `react`, `nestjs`)
- `@celva/tailwind-config` — Tailwind preset + design tokens (`celvaTokens`)

## Requirements

- Node ≥ 20
- pnpm ≥ 10
- Docker (for local Postgres 16)

## Quick start

```bash
pnpm install
pnpm db:up          # start Postgres 16 (docker compose)
pnpm dev            # run all apps (once apps exist)
```

## Scripts

| Script | What |
|--------|------|
| `pnpm dev` | Run dev servers for every app via Turbo |
| `pnpm build` | Build every app + package |
| `pnpm lint` | Lint everything |
| `pnpm typecheck` | TypeScript check everything |
| `pnpm test` | Run tests |
| `pnpm db:up` / `db:down` / `db:logs` / `db:reset` | Manage local Postgres |

## Documentation

Implementation docs live in [docs/](docs/):

- [`celva-agent-guide.md`](docs/celva-agent-guide.md) — setup guide, phase-by-phase
- [`celva-specs.md`](docs/celva-specs.md) — functional specs
- [`celva-schema.md`](docs/celva-schema.md) — Prisma schema v4

## Phases

Phase 1 — Fondations (this branch series): monorepo, API auth, admin shell, storefront shell, CI.
Phase 2 — Catalogue · Phase 3 — E-commerce core · Phase 4 — Livraison · Phase 5 — Supply chain · Phase 6 — Commissions/Finance · Phase 7 — Contenu & lancement.
