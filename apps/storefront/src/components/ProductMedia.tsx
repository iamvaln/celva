'use client';

import { useMemo, useState } from 'react';
import type { ApiProductImage } from '@/lib/catalogue';
import { pickLocalized } from '@/lib/catalogue';
import type { Locale } from '@/i18n/routing';
import { ProductGallery } from './ProductGallery';
import { ProductBuyPanel, type ProductBuyPanelProps } from './ProductBuyPanel';

/**
 * Owns the shared "active image" for the product detail page so the buy panel
 * (variant selectors) and the gallery (main image + thumbnails) stay in sync.
 *
 * Colour→image uses a heuristic: there's no structured image↔colour link in the
 * data model yet, so we match the selected colour label against each image's alt
 * text (which carries the colour for seeded products, e.g. "Robe Mino — coloris
 * rose"). Unmatched selections are no-ops.
 */

const COLOR_ATTR_KEYS = ['coloris', 'couleur', 'colour', 'color'];

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** True when an attribute name denotes a colour (FR/EN). */
export const isColorAttribute = (attributeName: string): boolean => {
  const n = normalize(attributeName);
  return COLOR_ATTR_KEYS.some((k) => n.includes(k));
};

/** First image whose alt text contains every significant word of `colorLabel`. */
const findImageIdByColor = (
  images: ApiProductImage[],
  locale: Locale,
  colorLabel: string,
): string | null => {
  const words = normalize(colorLabel)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
  if (words.length === 0) return null;
  for (const img of images) {
    const alt = normalize(pickLocalized(img.altText, locale) || '');
    if (alt && words.every((w) => alt.includes(w))) return img.id;
  }
  return null;
};

type GalleryConfig = {
  images: ApiProductImage[];
  productName: string;
  locale: Locale;
  noImageLabel: string;
};

/**
 * The two-column media + buy layout. Holds the active-image state and feeds it
 * to the gallery (controlled) while listening for colour picks from the buy
 * panel. Replaces a React Context to dodge the duplicate-@types/react Provider
 * typing issue in this monorepo.
 */
export function ProductDetailColumns({
  gallery,
  buyPanel,
}: {
  gallery: GalleryConfig;
  buyPanel: ProductBuyPanelProps;
}) {
  const defaultId = useMemo(
    () => (gallery.images.find((i) => i.isPrimary) ?? gallery.images[0])?.id ?? null,
    [gallery.images],
  );
  const [activeId, setActiveId] = useState<string | null>(defaultId);

  const onAttributeSelect = (attributeName: string, valueLabel: string) => {
    if (!isColorAttribute(attributeName)) return;
    const match = findImageIdByColor(gallery.images, gallery.locale, valueLabel);
    if (match) setActiveId(match);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <ProductGallery {...gallery} activeId={activeId} onSelect={setActiveId} />
      <ProductBuyPanel {...buyPanel} onAttributeSelect={onAttributeSelect} />
    </div>
  );
}
