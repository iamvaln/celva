# Celva

[![CI](https://github.com/iamvaln/celva/actions/workflows/ci.yml/badge.svg)](https://github.com/iamvaln/celva/actions/workflows/ci.yml)

Monorepo for **Celva Store** — bilingual (FR/EN) e-commerce platform for Cameroon.

## Stack

| App | Path | Tech | Prod target |
|-----|------|------|-------------|
| Storefront | [`apps/storefront`](apps/storefront/) | Next.js 15 App Router · next-intl · Tailwind | celva.store → Vercel |
| Admin | [`apps/admin`](apps/admin/) | React-Admin v5 · MUI 6 · Vite | admin.celva.store → Cloudflare Pages |
| API | [`apps/api`](apps/api/) | NestJS 10 · Prisma 5 · Postgres 16 | api.celva.store → VPS (Docker Compose + Caddy) |
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

Seed bootstrap uses `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` from `apps/api/.env` (no defaults in code). The seeded admin is forced to change the password on first sign-in.

## Scripts

| Script | What |
|--------|------|
| `npm run dev` | `turbo run dev` — all apps in parallel |
| `npm run build` | `turbo run build` — every app + package |
| `npm run lint` / `typecheck` / `test` | `turbo run …` across the monorepo |
| `npm run db:up` / `db:down` / `db:logs` / `db:reset` | docker-compose Postgres helpers |
| `npm run format` / `format:check` | Prettier across `**/*.{ts,tsx,md,json}` |

Per-app: every app exposes `dev`, `build`, `lint`, `typecheck`, `test`. The API also has `test:e2e` (requires Postgres) and `prisma:*`.

## Git flow

Two long-lived branches:

| Branch | Purpose | Deploys to |
|---|---|---|
| `main` | **Production.** Tracks what's currently live. No direct commits — only the release PR from `develop`. | `celva.store`, `admin.celva.store`, `api.celva.store` |
| `develop` | **Preproduction.** Integration of every batch in flight. | `preprod.celva.store`, `preprod.admin.celva.store`, `preprod.api.celva.store` |

Feature branches branch **off `develop`** and open PRs **into `develop`**:

```bash
git checkout develop && git pull
git checkout -b feature/batch-G-categories
# work, commit, push
gh pr create --base develop
```

Releases are intentional events — when a slice of `develop` is ready to go live, open a release PR from `develop` → `main` and merge that.

Hotfix exception: if production has a P0 bug and `develop` is too far ahead to ship, a `hotfix/<slug>` branch can target `main` directly — then back-merge `main` → `develop` immediately to avoid drift.

## CI/CD

`.github/workflows/`:

- **`ci.yml`** — runs on every push to `main`/`develop` and every PR. Three jobs:
  - **static** — install + `@celva/shared` build + `turbo run lint typecheck test`
  - **api-e2e** — boots Postgres 16 as a service, runs migrations + seed, then `apps/api && npm run test:e2e`
  - **build** — matrix of api / admin / storefront; storefront tolerated to fail while the static-prerender issue is open
- **`deploy-storefront.yml`** — Vercel; `main` → production (`celva.store`), `develop` → preview env
- **`deploy-admin.yml`** — Cloudflare Pages; `main` → production project, `develop` → preview branch
- **`deploy-api.yml`** — builds the API image → GHCR, then SSH `compose pull && up -d` on the shared VPS behind Traefik (stack in [`deploy/`](deploy/), same flow as the gabee project). Two stacks: push `develop` → preprod, tag `v*` → production

The **storefront/admin** deploy workflows ship disabled — set the corresponding `*_DEPLOY_ENABLED` repo variable to `true` and add the matching secrets. The **api** workflow needs only the `VPS_*` secrets (no enable flag); `develop` ships preprod, tag `v*` ships production:

| Deploy | Production secrets | Preprod secrets |
|---|---|---|
| storefront | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_STOREFRONT` | same token + project (Vercel env split via flag) |
| admin | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_API_URL_ADMIN` | + `VITE_API_URL_ADMIN_PREPROD` |
| api | `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (+ `VPS_PORT`/`VPS_APP_DIR` opt.); tag `v*` → prod | same secrets; push `develop` → preprod (GHCR uses the auto `GITHUB_TOKEN`) |

Dependabot (`.github/dependabot.yml`) opens grouped PRs weekly **into `develop`** (next, react, nestjs, mui, react-admin, prisma, types) plus monthly action updates.

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
