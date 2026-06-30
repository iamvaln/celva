#!/bin/sh
# Container entrypoint for the Celva API on Railway.
#
# Applies any pending Prisma migrations before the server boots — the runtime
# image ships the prisma CLI (devDeps are kept in node_modules) and the schema
# under ./prisma. This is safe to run on every deploy: `migrate deploy` only
# applies migrations that haven't run yet and is a no-op otherwise.
#
# Seeding is NOT run here on purpose: prisma/seed.ts upserts/updates delivery
# zones and settings, so running it on every boot would clobber admin edits.
# Seed once, by hand, on a fresh database:  npm run prisma:seed
set -e

echo "▶ Applying database migrations..."
npx prisma migrate deploy

echo "▶ Starting API..."
exec node dist/src/main.js
