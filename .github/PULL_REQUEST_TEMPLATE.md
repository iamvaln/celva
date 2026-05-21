## Target branch

<!--
PRs target `develop`, not `main`. The only PR into `main` is the release
PR from `develop`. See CONTRIBUTING / README → "Git flow" for the model.

If this is a hotfix that has to hit `main` directly, prefix the title
with `hotfix:` and back-merge `main` → `develop` immediately after.
-->

- [ ] This PR targets `develop`
- [ ] (or) This is a `hotfix:` to `main` — back-merge is queued

## What

<!-- One or two sentences. What landed, in plain language. -->

## Why

<!-- Link the issue / spec section / brief. If there isn't one, explain
the motivation in one sentence. -->

## How to test

- [ ] `npx turbo run typecheck lint test` is green
- [ ] Manual verify against the running app(s) — describe steps below
- [ ] (if API change) `apps/api && npm run test:e2e` against local Postgres

## Phase / batch

<!-- e.g. Phase 2 — Catalogue · Batch G · Categories CRUD -->

## Heads-up

<!-- Anything reviewers should look at twice, known limitations,
follow-ups. Leave the section header even if there's nothing — it's a
useful prompt. -->
