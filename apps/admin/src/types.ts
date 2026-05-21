import type { UserRole } from '@celva/shared';

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

export type Setting = {
  id: string;
  key: string;
  value: string;
  label?: { fr?: string; en?: string } | null;
};

export type Category = {
  id: string;
  slug: string;
  name: { fr: string; en: string };
  description?: { fr?: string; en?: string } | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AuthLoginResponse = {
  accessToken: string;
  user: AdminUser;
};

export type ApiEnvelope<T> = {
  data: T;
  requestId?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};
