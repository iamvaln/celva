/**
 * Read a required Vite env var (build-time inlined) or fail at module load.
 *
 * No fallbacks anywhere in runtime code — every config must come from
 * `.env` (see apps/admin/.env.example).
 */
export function requireViteEnv(name: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const value = env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required env var ${name}. Copy apps/admin/.env.example to apps/admin/.env and fill it in.`,
    );
  }
  return value;
}
