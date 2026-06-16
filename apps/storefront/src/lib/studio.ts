import type { Locale } from '@/i18n/routing';
import { apiFetch } from './api';

export type StudioFabric = {
  id: string;
  name: { fr: string; en: string };
  swatchImage: string | null;
  photoImage: string | null;
  sortOrder: number;
};

export type StudioGalleryItem = {
  id: string;
  imageKey: string;
  caption?: { fr?: string; en?: string } | null;
  isTall: boolean;
  sortOrder: number;
};

export type StudioModel = {
  id: string;
  slug: string;
  name: { fr: string; en: string };
  shortDescription?: { fr?: string; en?: string } | null;
  material?: { fr?: string; en?: string } | null;
  basePrice: string | number;
  delayLabel: { fr: string; en: string };
  coverImage: string | null;
  sortOrder: number;
  fabrics: StudioFabric[];
  galleryItems: StudioGalleryItem[];
};

type Paginated<T> = { data: T[]; total: number; page: number; pageSize: number };

/**
 * One round-trip for the whole configurator: returns active models with
 * their active fabrics + gallery items eager-loaded, sorted server-side.
 * The /studio page caches with ISR (60s) — the configurator state lives
 * client-side and never re-fetches.
 */
export const listStudioModels = async (locale: Locale): Promise<StudioModel[]> => {
  const res = await apiFetch<Paginated<StudioModel>>(
    '/studio/models?pageSize=50',
    { locale, next: { revalidate: 60 } },
  );
  return res.data;
};
