/**
 * In dev, Vite proxies `/api/*` → `${VITE_API_URL}/api/v1/*`. In prod we hit
 * the API URL directly. VITE_API_URL is required in both modes — copy
 * apps/admin/.env.example to apps/admin/.env and fill it in.
 */
import { requireViteEnv } from './env';

const isDev = import.meta.env.DEV;
export const API_BASE = isDev ? '/api/v1' : `${requireViteEnv('VITE_API_URL')}/v1`;

export const APP_SOURCE = 'WEB_ADMIN';

export const STORAGE_KEYS = {
  accessToken: 'celva.admin.accessToken',
  userPreview: 'celva.admin.user',
  locale: 'celva.admin.locale',
  themeMode: 'celva.admin.themeMode',
} as const;
