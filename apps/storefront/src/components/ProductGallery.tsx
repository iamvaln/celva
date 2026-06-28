'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import type { ApiProductImage } from '@/lib/catalogue';
import { pickLocalized } from '@/lib/catalogue';
import type { Locale } from '@/i18n/routing';

type ProductGalleryProps = {
  images: ApiProductImage[];
  productName: string;
  locale: Locale;
  noImageLabel: string;
  /** Controlled active image id (from the shared media state). */
  activeId?: string | null;
  /** Called when a thumbnail is clicked. */
  onSelect?: (id: string) => void;
};

const ZOOM_SCALE = 2.2;

export function ProductGallery({
  images,
  productName,
  locale,
  noImageLabel,
  activeId: controlledActiveId,
  onSelect,
}: ProductGalleryProps) {
  const defaultImage = images.find((i) => i.isPrimary) ?? images[0] ?? null;
  const [internalId, setInternalId] = useState<string | null>(defaultImage?.id ?? null);
  const activeId = controlledActiveId !== undefined ? controlledActiveId : internalId;
  const setActive = onSelect ?? setInternalId;
  const activeImage = images.find((i) => i.id === activeId) ?? defaultImage;

  // Hover zoom ("loupe"): scale the main image and pan its transform-origin to
  // follow the cursor so the user can inspect detail without leaving the page.
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  return (
    <div className="space-y-4">
      <div
        ref={frameRef}
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={onMove}
        className="group relative aspect-product-portrait overflow-hidden bg-beige md:cursor-zoom-in"
      >
        {activeImage ? (
          <>
            <Image
              src={activeImage.urls.large}
              alt={pickLocalized(activeImage.altText, locale) || productName}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              className="object-cover transition-transform duration-200 ease-out"
              style={{
                transform: zooming ? `scale(${ZOOM_SCALE})` : 'scale(1)',
                transformOrigin: `${origin.x}% ${origin.y}%`,
              }}
            />
            {/* Loupe affordance (hidden once actively zooming, and on touch). */}
            <span
              aria-hidden
              className={`pointer-events-none absolute right-3 top-3 hidden h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur transition-opacity md:flex ${
                zooming ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35M11 8v6M8 11h6" strokeLinecap="round" />
              </svg>
            </span>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground-muted">
            <span className="eyebrow">{noImageLabel}</span>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img) => {
            const isActive = img.id === activeImage?.id;
            const alt = pickLocalized(img.altText, locale) || productName;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(img.id)}
                aria-label={alt}
                aria-pressed={isActive}
                className={`relative aspect-square overflow-hidden bg-beige transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                  isActive ? 'ring-2 ring-accent' : 'opacity-80 hover:opacity-100'
                }`}
              >
                <Image
                  src={img.urls.medium}
                  alt={alt}
                  fill
                  sizes="(max-width: 1024px) 33vw, 16vw"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
