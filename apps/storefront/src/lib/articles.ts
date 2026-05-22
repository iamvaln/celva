import { apiFetch } from '@/lib/api';
import type { Locale } from '@/i18n/routing';

export type ArticleCategory = 'STYLE' | 'BEHIND_THE_SCENES' | 'EVENTS' | 'GUIDES';

export type Article = {
  id: string;
  title: { fr: string; en: string };
  slug: string;
  content: { fr: string; en: string };
  excerpt: { fr?: string; en?: string } | null;
  coverImage: string | null;
  category: ArticleCategory;
  isPublished: boolean;
  publishedAt: string | null;
  author?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedArticles = {
  data: Article[];
  total: number;
  page: number;
  pageSize: number;
};

export type JournalFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: ArticleCategory;
};

const PAGE_SIZE = 12;

export const listArticles = async (
  filters: JournalFilters,
  locale: Locale,
): Promise<PaginatedArticles> => {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? PAGE_SIZE));
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  return apiFetch<PaginatedArticles>(`/articles?${params.toString()}`, {
    locale,
    next: { revalidate: 60 },
  });
};

export const getArticleBySlug = async (
  slug: string,
  locale: Locale,
): Promise<Article> =>
  apiFetch<Article>(`/articles/by-slug/${encodeURIComponent(slug)}`, {
    locale,
    next: { revalidate: 60 },
  });
