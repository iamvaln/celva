import type { AuthProvider } from 'react-admin';
import { ADMIN_ROLES as BACKOFFICE_ROLE_LIST } from '@celva/shared';
import { API_BASE, STORAGE_KEYS } from './config';
import { fetchJson } from './http';
import type { HttpError } from './http';
import type { AdminUser, AuthLoginResponse } from './types';

type JwtPayload = { sub: string; email: string; role: string; exp: number };

const decodeJwt = (token: string): JwtPayload | null => {
  try {
    const middle = token.split('.')[1];
    if (!middle) return null;
    const json = atob(middle.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
};

const storeUser = (token: string, user: AdminUser): void => {
  window.localStorage.setItem(STORAGE_KEYS.accessToken, token);
  window.localStorage.setItem(STORAGE_KEYS.userPreview, JSON.stringify(user));
};

const clearAuth = (): void => {
  window.localStorage.removeItem(STORAGE_KEYS.accessToken);
  window.localStorage.removeItem(STORAGE_KEYS.userPreview);
};

const tryRefresh = async (): Promise<boolean> => {
  try {
    const { body } = await fetchJson<AuthLoginResponse>(`${API_BASE}/auth/refresh`, {
      method: 'POST',
    });
    storeUser(body.accessToken, body.user);
    return true;
  } catch {
    return false;
  }
};

// Every back-office role may sign in (excludes the storefront CLIENT role);
// what they can see/do is then governed by the RBAC permission model.
const ADMIN_ROLES = new Set<string>(BACKOFFICE_ROLE_LIST);

export const authProvider: AuthProvider = {
  async login({ username, password }: { username: string; password: string }) {
    const { body } = await fetchJson<AuthLoginResponse>(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: username, password }),
    });
    if (!ADMIN_ROLES.has(body.user.role)) {
      throw new Error('forbidden_role');
    }
    storeUser(body.accessToken, body.user);
  },

  async logout() {
    try {
      await fetchJson(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch {
      // Best effort: even if the server rejects, drop local state.
    }
    clearAuth();
  },

  async checkAuth() {
    const token = window.localStorage.getItem(STORAGE_KEYS.accessToken);
    if (!token) throw new Error('unauthenticated');
    const payload = decodeJwt(token);
    if (!payload) {
      clearAuth();
      throw new Error('invalid_token');
    }
    if (payload.exp * 1000 < Date.now()) {
      const refreshed = await tryRefresh();
      if (!refreshed) {
        clearAuth();
        throw new Error('expired');
      }
    }
  },

  async checkError(error) {
    const status = (error as HttpError | { status?: number }).status;
    if (status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) return;
      clearAuth();
      throw error;
    }
    if (status === 403) {
      throw error;
    }
  },

  async getPermissions() {
    const token = window.localStorage.getItem(STORAGE_KEYS.accessToken);
    if (!token) return null;
    return decodeJwt(token)?.role ?? null;
  },

  async getIdentity() {
    const raw = window.localStorage.getItem(STORAGE_KEYS.userPreview);
    if (!raw) throw new Error('unauthenticated');
    const user = JSON.parse(raw) as AdminUser;
    return { id: user.id, fullName: user.name, email: user.email };
  },
};
