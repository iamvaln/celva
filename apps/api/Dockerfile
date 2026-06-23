# syntax=docker/dockerfile:1.7
# Multi-stage build for Celva API (Render / any Docker host).

FROM node:20-alpine AS base
WORKDIR /workspace
RUN apk add --no-cache openssl libc6-compat

# ---- deps ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/tailwind-config/package.json ./packages/tailwind-config/
COPY apps/api/package.json ./apps/api/
# --ignore-scripts keeps third-party install scripts from running, but that also
# skips the native-addon builds for bcrypt and @sentry/profiling-node, leaving
# their *.node binaries absent at runtime. Add a build toolchain and rebuild just
# those two explicitly. (The toolchain stays in this stage; the runtime image is
# a separate FROM and only copies the compiled node_modules.)
RUN apk add --no-cache python3 make g++ \
 && npm install --ignore-scripts \
 && npm rebuild bcrypt @sentry/profiling-node

# ---- build ----
FROM deps AS build
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json turbo.json ./
# Build the shared workspace package first: apps/api resolves @celva/shared
# through its compiled dist/ (see packages/shared exports), so it must exist
# before nest build — otherwise tsc can't resolve the package's types.
RUN npm run build --workspace @celva/shared
WORKDIR /workspace/apps/api
RUN npx prisma generate
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
# libstdc++ is needed by the compiled native addons (bcrypt, sentry profiling).
RUN apk add --no-cache openssl libc6-compat libstdc++
ENV NODE_ENV=production
COPY --from=build /workspace/apps/api/dist ./dist
COPY --from=build /workspace/apps/api/prisma ./prisma
# prisma/seed.ts (run via tsx as a one-shot) imports from ../src, so the TS
# source is needed at runtime for the seed step.
COPY --from=build /workspace/apps/api/src ./src
COPY --from=build /workspace/apps/api/package.json ./
COPY --from=build /workspace/apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages ./packages
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3001
# Entrypoint runs `prisma migrate deploy` then boots dist/src/main.js
# (Nest compiles src/ → dist/src/ because rootDir is the project root).
CMD ["./docker-entrypoint.sh"]
