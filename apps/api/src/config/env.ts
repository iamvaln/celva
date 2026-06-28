import { z } from 'zod';

// No `.default(...)` anywhere — every var must come from `.env` (see
// apps/api/.env.example). This prevents accidental dev-key leakage and
// production startup with implicit defaults. Optional() is preserved for
// genuinely feature-gating vars (R2, Mailgun, Sentry) — when absent, the
// feature degrades; when present, it's exercised end-to-end.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive(),
  API_VERSION: z.string(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRATION: z.string(),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_REFRESH_EXPIRATION: z.string(),

  // All R2 / Cloudflare Images vars are feature-gating: when absent, storage
  // degrades to the local filesystem (see storage.module.ts). Dev/CI run on
  // the local folder, so none of these are required to boot.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  R2_ENDPOINT: z.string().url().optional(),
  CF_IMAGES_BASE_URL: z.string().url().optional(),

  CORS_ORIGINS: z.string(),
  COOKIE_SECRET: z.string().min(32),
  STOREFRONT_URL: z.string().url(),
  ADMIN_URL: z.string().url(),

  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  MAILGUN_FROM: z.string().optional(),
  MAILGUN_REGION: z.enum(['us', 'eu']),

  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1),

  // Feature-gating: when absent, the AI content-assist endpoints (/ai/*)
  // return 503 instead of running. The app still boots without it.
  ANTHROPIC_API_KEY: z.string().optional(),
  // Pluggable AI: which provider serves /ai/* (default "anthropic") and which
  // model id (default "claude-opus-4-8"). Swap models without code changes.
  AI_PROVIDER: z.string().optional(),
  AI_MODEL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>): Env => {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
};

export const corsOrigins = (env: Env): string[] =>
  env.CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
