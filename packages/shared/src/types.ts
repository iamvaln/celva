import type { LocalizedText } from './i18n';

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ApiError = {
  statusCode: number;
  message: string | LocalizedText;
  error?: string;
  requestId?: string;
};

export type IdParam = { id: string };

export type SortDirection = 'asc' | 'desc';

export type ListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDirection;
};
