# @celva/shared

Source of truth for enums, types, and constants shared across all Celva apps.

Mirrors the Prisma schema (`docs/celva-schema.md` v4) using `as const` objects + type aliases (instead of TS `enum`) — values are Prisma-compatible strings, types are erasable, and tree-shaking works.

## Subpaths

- `@celva/shared/enums` — all schema v4 enums (`USER_ROLE`, `ORDER_STATUS`, ...)
- `@celva/shared/i18n` — `LocalizedText`, `Locale`, `resolveLocale`, `pickLocalized`
- `@celva/shared/constants` — `TAX_RATE_CAMEROON`, `SETTING_KEYS`, rate limits, JWT cookie name, etc.
- `@celva/shared/types` — `Paginated<T>`, `ApiError`, `ListQuery`
