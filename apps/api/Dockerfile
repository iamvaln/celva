# syntax=docker/dockerfile:1.7
# Multi-stage build for Celva API on Railway.

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
RUN npm install --ignore-scripts

# ---- build ----
FROM deps AS build
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json turbo.json ./
WORKDIR /workspace/apps/api
RUN npx prisma generate
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
ENV NODE_ENV=production
COPY --from=build /workspace/apps/api/dist ./dist
COPY --from=build /workspace/apps/api/prisma ./prisma
COPY --from=build /workspace/apps/api/package.json ./
COPY --from=build /workspace/apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages ./packages
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3001
# Entrypoint runs `prisma migrate deploy` then boots dist/src/main.js
# (Nest compiles src/ → dist/src/ because rootDir is the project root).
CMD ["./docker-entrypoint.sh"]
