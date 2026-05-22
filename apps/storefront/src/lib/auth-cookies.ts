import { cookies } from 'next/headers';

const ACCESS_COOKIE = 'celva.access';
const ACCESS_MAX_AGE_S = 15 * 60; // matches JWT_ACCESS_EXPIRATION

/**
 * Storefront-side access token, stored as an httpOnly cookie on the
 * Next.js host. The browser never sees it — server components and
 * route handlers read it via this helper and forward it as a Bearer
 * header to the API.
 *
 * The API's refresh cookie (celva_refresh, signed, httpOnly) lives on
 * api.celva.store in prod / localhost:3001 in dev. We don't touch it
 * here; refresh-on-401 calls /v1/auth/refresh through the proxy and
 * the API sets a fresh cookie via Set-Cookie.
 */
export const getAccessToken = async (): Promise<string | undefined> => {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value;
};

export const setAccessToken = async (token: string): Promise<void> => {
  const store = await cookies();
  store.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ACCESS_MAX_AGE_S,
  });
};

export const clearAccessToken = async (): Promise<void> => {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
};
