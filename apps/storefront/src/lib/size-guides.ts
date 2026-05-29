import { apiFetch } from '@/lib/api';
import type { Locale } from '@/i18n/routing';

export type SizeGuide = {
  id: string;
  name: { fr: string; en: string };
  content: { fr: string; en: string };
  categoryId: string;
  category?: { id: string; slug: string; name: { fr: string; en: string } };
};

export const listSizeGuides = async (locale: Locale): Promise<SizeGuide[]> =>
  apiFetch<SizeGuide[]>('/size-guides', { locale, next: { revalidate: 300 } });

export const listSizeGuidesByCategory = async (
  categoryId: string,
  locale: Locale,
): Promise<SizeGuide[]> =>
  apiFetch<SizeGuide[]>(`/size-guides/by-category/${encodeURIComponent(categoryId)}`, {
    locale,
    next: { revalidate: 300 },
  });
