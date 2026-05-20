import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authProvider } from './authProvider';
import { STORAGE_KEYS } from './config';

const mockFetch = vi.fn();

// Build a JWT-like string (header.payload.signature) — only payload matters for decode.
const fakeJwt = (payload: object): string => {
  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.signature`;
};

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

const okJson = (body: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
  } as Response);

describe('authProvider', () => {
  it('login: stores token + user when role is ADMIN', async () => {
    const token = fakeJwt({ sub: 'u1', email: 'a@celva', role: 'ADMIN', exp: Date.now() / 1000 + 900 });
    mockFetch.mockReturnValue(
      okJson({ data: { accessToken: token, user: { id: 'u1', email: 'a@celva', role: 'ADMIN', name: 'Admin' } } }),
    );
    await authProvider.login({ username: 'a@celva', password: 'pw' });
    expect(window.localStorage.getItem(STORAGE_KEYS.accessToken)).toBe(token);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.userPreview)!).role).toBe('ADMIN');
  });

  it('login: rejects CLIENT role with forbidden_role', async () => {
    const token = fakeJwt({ sub: 'u1', email: 'a@celva', role: 'CLIENT', exp: Date.now() / 1000 + 900 });
    mockFetch.mockReturnValue(
      okJson({ data: { accessToken: token, user: { id: 'u1', email: 'a@celva', role: 'CLIENT', name: 'Client' } } }),
    );
    await expect(authProvider.login({ username: 'a@celva', password: 'pw' })).rejects.toThrow(
      'forbidden_role',
    );
    expect(window.localStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
  });

  it('checkAuth: rejects when no token', async () => {
    await expect(authProvider.checkAuth({})).rejects.toThrow();
  });

  it('checkAuth: rejects + clears when token is expired and refresh fails', async () => {
    const expired = fakeJwt({ sub: 'u1', email: 'a@celva', role: 'ADMIN', exp: Date.now() / 1000 - 10 });
    window.localStorage.setItem(STORAGE_KEYS.accessToken, expired);
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: () => Promise.resolve({ message: 'unauthorized' }),
      } as Response),
    );
    await expect(authProvider.checkAuth({})).rejects.toThrow();
    expect(window.localStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
  });

  it('getPermissions: returns role from JWT', async () => {
    const token = fakeJwt({ sub: 'u1', email: 'a@celva', role: 'MANAGER', exp: Date.now() / 1000 + 900 });
    window.localStorage.setItem(STORAGE_KEYS.accessToken, token);
    const perms = await authProvider.getPermissions!({});
    expect(perms).toBe('MANAGER');
  });

  it('getPermissions: null when no token', async () => {
    const perms = await authProvider.getPermissions!({});
    expect(perms).toBeNull();
  });
});
