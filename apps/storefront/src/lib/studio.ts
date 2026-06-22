import type { Locale } from '@/i18n/routing';
import { apiFetch } from './api';

export type StudioBilingual = { fr: string; en: string };

export type StudioFabric = {
  id: string;
  name: StudioBilingual;
  swatchImage: string | null;
  photoImage: string | null;
  sortOrder: number;
};

export type StudioModelAngle = 'FRONT' | 'SIDE' | 'BACK' | 'DETAIL';

export type StudioPhoto = {
  id: string;
  imageKey: string;
  caption?: { fr?: string; en?: string } | null;
  angle?: StudioModelAngle | null;
  sortOrder: number;
};

export type StudioGarment = {
  id: string;
  name: StudioBilingual;
  description?: { fr?: string; en?: string } | null;
  sortOrder: number;
  photos: StudioPhoto[];
};

export type StudioFamily = {
  id: string;
  slug: string;
  name: StudioBilingual;
  description?: { fr?: string; en?: string } | null;
  coverImage: string | null;
  sortOrder: number;
  fabrics: StudioFabric[];
  garments: StudioGarment[];
};

type Paginated<T> = { data: T[]; total: number; page: number; pageSize: number };

/**
 * One round-trip for the whole /studio page: returns active families
 * with their active fabrics + active garments + active photos, sorted
 * server-side. Cached with ISR (60s).
 */
export const listStudioFamilies = async (locale: Locale): Promise<StudioFamily[]> => {
  const res = await apiFetch<Paginated<StudioFamily>>(
    '/studio/families?pageSize=50',
    { locale, next: { revalidate: 60 } },
  );
  return res.data;
};

export type StudioRequestPayload = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerCity?: string;
  appointmentMode: 'ATELIER' | 'VISIO';
  appointmentDate: string;
  appointmentSlot: string;
  selectedFabricIds?: string[];
  notes?: string;
};

export const submitStudioRequest = async (
  payload: StudioRequestPayload,
  locale: Locale,
): Promise<{ id: string }> => {
  return apiFetch<{ id: string }>('/studio/requests', {
    method: 'POST',
    body: payload,
    locale,
  });
};
