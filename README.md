# Celva

[![CI](https://github.com/iamvaln/celva/actions/workflows/ci.yml/badge.svg)](https://github.com/iamvaln/celva/actions/workflows/ci.yml)

Monorepo for **Celva Store** — bilingual (FR/EN) e-commerce platform for Cameroon.

## Stack

| App | Path | Tech | Prod target |
|-----|------|------|-------------|
| Storefront | [`apps/storefront`](apps/storefront/) | Next.js 15 App Router · next-intl · Tailwind | celva.store → Vercel |
| Admin | [`apps/admin`](apps/admin/) | React-Admin v5 · MUI 6 · Vite | admin.celva.store → Cloudflare Pages |
| API | [`apps/api`](apps/api/) | NestJS 10 · Prisma 5 · Postgres 16 | api.celva.store → Railway |
| Delivery (Phase 4) | `apps/delivery` | React + Vite PWA | livraison.celva.store → Cloudflare Pages |

Shared code under [`packages/`](packages/):

- [`@celva/shared`](packages/shared/) — enums, types, constants mirroring schema v4
- [`@celva/typescript-config`](packages/typescript-config/) — `tsconfig` presets (`base`, `nestjs`, `nextjs`, `react-library`, `vite`)
- [`@celva/eslint-config`](packages/eslint-config/) — flat-config presets (`base`, `next`, `react`, `nestjs`)
- [`@celva/tailwind-config`](packages/tailwind-config/) — Tailwind preset + Celva design tokens

## Requirements

- Node ≥ 20
- npm ≥ 10 (the repo runs on npm workspaces, not pnpm — see `feedback-workflow-cadence.md` for the why)
- Postgres 16 (Docker recommended; native Postgres ≥ 14 also works)

## Quick start

```bash
npm install
npm run db:up                    # docker compose up -d postgres
cd apps/api && npx prisma migrate dev && npx tsx prisma/seed.ts
npx turbo run dev                # boots api + admin + storefront
```

Default admin credentials after seed: **admin@celva.store** / **ChangeMe123!** — change on first login.

## Scripts

| Script | What |
|--------|------|
| `npm run dev` | `turbo run dev` — all apps in parallel |
| `npm run build` | `turbo run build` — every app + package |
| `npm run lint` / `typecheck` / `test` | `turbo run …` across the monorepo |
| `npm run db:up` / `db:down` / `db:logs` / `db:reset` | docker-compose Postgres helpers |
| `npm run format` / `format:check` | Prettier across `**/*.{ts,tsx,md,json}` |

Per-app: every app exposes `dev`, `build`, `lint`, `typecheck`, `test`. The API also has `test:e2e` (requires Postgres) and `prisma:*`.

## CI/CD

`.github/workflows/`:

- **`ci.yml`** — runs on every push to `main`/`develop` and every PR. Three jobs:
  - **static** — install + `@celva/shared` build + `turbo run lint typecheck test`
  - **api-e2e** — boots Postgres 16 as a service, runs migrations + seed, then `apps/api && npm run test:e2e`
  - **build** — matrix of api / admin / storefront; storefront tolerated to fail while the static-prerender issue is open
- **`deploy-storefront.yml`** — Vercel deploy on push-to-main, gated by `vars.STOREFRONT_DEPLOY_ENABLED='true'`
- **`deploy-admin.yml`** — Cloudflare Pages deploy via wrangler-action, gated by `vars.ADMIN_DEPLOY_ENABLED='true'`
- **`deploy-api.yml`** — Railway CLI deploy, gated by `vars.API_DEPLOY_ENABLED='true'`

The deploy workflows ship disabled. To turn them on, set the corresponding repo variable to `true` and add the matching secrets:

| Deploy | Required secrets |
|---|---|
| storefront | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_STOREFRONT` |
| admin | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_API_URL_ADMIN` |
| api | `RAILWAY_TOKEN` |

Dependabot (`.github/dependabot.yml`) opens grouped PRs weekly (next, react, nestjs, mui, react-admin, prisma, types) plus monthly action updates.

## Documentation

Implementation docs live in [`docs/`](docs/):

- [`celva-agent-guide.md`](docs/celva-agent-guide.md) — setup guide, phase-by-phase
- [`celva-specs.md`](docs/celva-specs.md) — functional specs
- [`celva-schema.md`](docs/celva-schema.md) — Prisma schema v4

Design reference: [`design/DESIGN_SYSTEM.md`](design/DESIGN_SYSTEM.md) (Tailwind tokens cheat sheet) and [`design/celva-brief-visuel.md`](design/celva-brief-visuel.md) (Brand Book v01, 2026).

## Phase progress

| Phase | Status |
|---|---|
| **1 — Fondations** | ✅ A monorepo · ✅ B API foundations · ✅ C auth/users/settings · ✅ D React-Admin · ✅ E storefront · ✅ F CI/CD |
| 2 — Catalogue | ⏳ next |
| 3 — E-commerce core | – |
| 4 — Livraison | – |
| 5 — Supply chain | – |
| 6 — Commissions/Finance | – |
| 7 — Contenu & lancement | – |
