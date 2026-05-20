import { APP_SOURCE, STORAGE_KEYS } from './config';
import type { ApiEnvelope } from './types';

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
  }
}

const buildHeaders = (init?: RequestInit): Headers => {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');
  headers.set('X-App-Source', APP_SOURCE);
  const locale =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(STORAGE_KEYS.locale) ?? 'fr'
      : 'fr';
  headers.set('Accept-Language', locale);

  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem(STORAGE_KEYS.accessToken);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
};

export const fetchJson = async <T>(
  url: string,
  init: RequestInit = {},
): Promise<{ body: T; status: number }> => {
  const response = await fetch(url, {
    ...init,
    headers: buildHeaders(init),
    credentials: 'include',
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `HTTP ${response.status}`) || 'Request failed';
    throw new HttpError(response.status, message, payload);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return { body: (payload as ApiEnvelope<T>).data, status: response.status };
  }
  return { body: payload as T, status: response.status };
};

export { HttpError };
