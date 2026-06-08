/**
 * Read a required env var or fail at module load.
 *
 * No fallbacks anywhere in runtime code — every config must come from
 * `.env` (see apps/storefront/.env.example). Works for both server-only
 * vars and NEXT_PUBLIC_* (inlined by Next at build).
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required env var ${name}. Copy apps/storefront/.env.example to apps/storefront/.env and fill it in.`,
    );
  }
  return value;
}
