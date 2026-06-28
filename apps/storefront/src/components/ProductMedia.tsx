'use client';

import { useMemo, useState } from 'react';
import type { ApiProductImage } from '@/lib/catalogue';
import type { Locale } from '@/i18n/routing';
import { ProductGallery } from './ProductGallery';
import { ProductBuyPanel, type ProductBuyPanelProps } from './ProductBuyPanel';

/**
 * Owns the shared "active image" for the product detail page so the buy panel
 * (variant selectors) and the gallery (main image + thumbnails) stay in sync.
 *
 * Colour→image is exact: each image may be tagged with the attribute value it
 * depicts (ProductImage.attributeValueId). When the user picks an attribute
 * value, we switch to the first image tagged with that value. Untagged
 * selections (e.g. a length, or a colour with no photo) are no-ops.
 */

type GalleryConfig = {
  images: ApiProductImage[];
  productName: string;
  locale: Locale;
  noImageLabel: string;
};

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

  const onValueSelect = (attributeValueId: string) => {
    const match = gallery.images.find((i) => i.attributeValueId === attributeValueId);
    if (match) setActiveId(match.id);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <ProductGallery {...gallery} activeId={activeId} onSelect={setActiveId} />
      <ProductBuyPanel {...buyPanel} onValueSelect={onValueSelect} />
    </div>
  );
}
