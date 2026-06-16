/**
 * Studio sur-mesure shared constants — used by API validation and storefront
 * configurator. Single source of truth so the eight skin tones, available
 * sizes, appointment slots and silhouette height range never drift between
 * back and front.
 */

export const STUDIO_TEINTS = [
  { hex: '#F4DCC6', name: { fr: 'Porcelaine', en: 'Porcelain' } },
  { hex: '#E9C3A2', name: { fr: 'Sable', en: 'Sand' } },
  { hex: '#DBA77E', name: { fr: 'Miel', en: 'Honey' } },
  { hex: '#C88A5E', name: { fr: 'Caramel', en: 'Caramel' } },
  { hex: '#A86A42', name: { fr: 'Bronze', en: 'Bronze' } },
  { hex: '#834F30', name: { fr: 'Acajou', en: 'Mahogany' } },
  { hex: '#5D3A22', name: { fr: 'Café', en: 'Coffee' } },
  { hex: '#3D2616', name: { fr: 'Ébène', en: 'Ebony' } },
] as const;

export type StudioTeintIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const STUDIO_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
export type StudioSize = (typeof STUDIO_SIZES)[number];

export const STUDIO_SIZE_REFS = [
  'XS / 34',
  'S / 36',
  'M / 38',
  'L / 40',
  'XL / 42',
  'XXL / 44',
  '3XL / 46',
  'Sur-mesure complet',
] as const;
export type StudioSizeRef = (typeof STUDIO_SIZE_REFS)[number];

export const STUDIO_APPT_SLOTS = [
  '10:00',
  '11:30',
  '14:00',
  '15:30',
  '17:00',
  '18:30',
] as const;
export type StudioApptSlot = (typeof STUDIO_APPT_SLOTS)[number];

export const STUDIO_HEIGHT_RANGE = { min: 150, max: 200, default: 168 } as const;
