/**
 * In dev, Vite proxies `/api/*` → `${VITE_API_URL}/api/v1/*`. In prod we point
 * directly at `https://api.celva.store/v1`. Setting both lets the same code
 * work in either context.
 */
const isDev = import.meta.env.DEV;
export const API_BASE = isDev
  ? '/api/v1'
  : (import.meta.env.VITE_API_URL ?? 'https://api.celva.store') + '/v1';

export const APP_SOURCE = 'WEB_ADMIN';

export const STORAGE_KEYS = {
  accessToken: 'celva.admin.accessToken',
  userPreview: 'celva.admin.user',
  locale: 'celva.admin.locale',
  themeMode: 'celva.admin.themeMode',
} as const;
