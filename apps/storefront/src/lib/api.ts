import { APP_SOURCE, type Locale } from '@celva/shared';

/**
 * Server-side fetch helper. Talks to the API via the Next.js rewrite
 * (so we never expose api.celva.store in the browser).
 *
 * In dev: client and server both go through Next's /api/* rewrite.
 * In prod: server-side requests go directly to api.celva.store via
 *          API_INTERNAL_URL; the browser hits celva.store/api/* and
 *          Next's rewrite forwards.
 */

const SERVER_BASE = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

type Envelope<T> = { data: T; requestId?: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly key: string,
    public readonly bodyText?: string,
  ) {
    super(key);
  }
}

export type FetchOptions = {
  locale?: Locale;
  accessToken?: string;
  cookie?: string;
  method?: string;
  body?: unknown;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
};

const buildUrl = (path: string, browser: boolean): string => {
  const base = browser ? '/api' : `${SERVER_BASE}/api`;
  const trimmed = path.startsWith('/') ? path : `/${path}`;
  return `${base}/v1${trimmed}`;
};

export const apiFetch = async <T>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> => {
  const browser = typeof window !== 'undefined';
  const url = buildUrl(path, browser);
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  headers.set('X-App-Source', APP_SOURCE.WEB_STORE);
  if (opts.locale) headers.set('Accept-Language', opts.locale);
  if (opts.body) headers.set('Content-Type', 'application/json');
  if (opts.accessToken) headers.set('Authorization', `Bearer ${opts.accessToken}`);
  if (opts.cookie) headers.set('Cookie', opts.cookie);

  const response = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
    cache: opts.cache,
    next: opts.next,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const key =
      isJson && payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `errors.http_${response.status}`;
    throw new ApiError(response.status, key, isJson ? JSON.stringify(payload) : (payload as string));
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as Envelope<T>).data;
  }
  return payload as T;
};
