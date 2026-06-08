/**
 * Read a required env var or fail fast at boot.
 *
 * No fallbacks anywhere in runtime code — every config must come from
 * `.env` (see apps/api/.env.example). This keeps dev / staging / prod
 * explicit and prevents accidental prod-default leakage.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required env var ${name}. Copy apps/api/.env.example to apps/api/.env and fill it in.`,
    );
  }
  return value;
}
