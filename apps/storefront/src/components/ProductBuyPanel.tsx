'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { ApiVariant } from '@/lib/catalogue';
import { formatPriceXAF } from '@/lib/money';
import { addGuestItem } from '@/lib/guest-cart';
import { addToCartAction } from '@/app/[locale]/cart/actions';
import {
  addToWishlistAction,
  removeFromWishlistAction,
} from '@/app/[locale]/wishlist/actions';

export type BuyPanelAttribute = {
  id: string;
  name: string;
  /** Looks size-like (e.g. "Taille" / "Size") — gets the size-guide link. */
  isSize: boolean;
  values: Array<{ id: string; label: string; colorHex?: string | null }>;
};

export type ProductBuyPanelProps = {
  name: string;
  /** Base display price (string XAF). */
  displayPrice: string;
  /** Short teaser shown under the title. */
  shortDescription?: string;
  /** Eyebrow segments, e.g. category + collection. Rendered joined by "·". */
  eyebrow?: string[];
  attributes: BuyPanelAttribute[];
  variants: ApiVariant[];
  locale: Locale;
  fromPath: string;
  /** variantIds already in the wishlist. */
  wishlistVariantIds: string[];
  /** Hash anchor on the size-guides page, if a guide exists for this category. */
  sizeGuideHash?: string;
  /** Long description / composition copy for the accordions, when available. */
  longDescription?: string;
  /** Whether a custom-order (studio) route exists. */
  hasStudio?: boolean;
  /** True when a session cookie is present — drives server vs guest add-to-cart. */
  isAuthenticated: boolean;
  /** Product slug, for the guest-cart line snapshot. */
  productSlug: string;
  /** Hero image URL, for the guest-cart line snapshot. */
  imageUrl?: string;
  /** Notified with the chosen attribute-value id on every pick — lets the page
   * swap the gallery to the image tagged with that value (e.g. a colour). */
  onValueSelect?: (attributeValueId: string) => void;
};

/** A variant matches a selection when every selected value appears in it. */
const variantMatchesSelection = (
  variant: ApiVariant,
  selection: Record<string, string>,
): boolean =>
  Object.values(selection).every((valueId) =>
    variant.attributeValues.some((av) => av.attributeValueId === valueId),
  );

/** Best in-stock variant for a (possibly partial) selection, else any match. */
const findVariant = (
  variants: ApiVariant[],
  selection: Record<string, string>,
): ApiVariant | null => {
  const matches = variants.filter((v) => variantMatchesSelection(v, selection));
  return matches.find((v) => v.stock > 0) ?? matches[0] ?? null;
};

export function ProductBuyPanel({
  name,
  displayPrice,
  shortDescription,
  eyebrow,
  attributes,
  variants,
  locale,
  fromPath,
  wishlistVariantIds,
  sizeGuideHash,
  longDescription,
  hasStudio,
  isAuthenticated,
  productSlug,
  imageUrl,
  onValueSelect,
}: ProductBuyPanelProps) {
  const t = useTranslations('product');
  const router = useRouter();

  // Default selection = the values of the first in-stock variant (or first
  // variant if none in stock), so the panel opens on a buyable combination.
  const initialSelection = useMemo<Record<string, string>>(() => {
    const seed = variants.find((v) => v.stock > 0) ?? variants[0] ?? null;
    const sel: Record<string, string> = {};
    if (!seed) return sel;
    for (const attr of attributes) {
      const match = seed.attributeValues.find((av) =>
        attr.values.some((val) => val.id === av.attributeValueId),
      );
      if (match) sel[attr.id] = match.attributeValueId;
    }
    return sel;
  }, [attributes, variants]);

  const [selection, setSelection] =
    useState<Record<string, string>>(initialSelection);
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = useMemo(
    () => findVariant(variants, selection),
    [variants, selection],
  );

  const unitPrice = selectedVariant?.priceOverride ?? displayPrice;
  const maxStock = selectedVariant?.stock ?? 0;
  const inStock = !!selectedVariant && maxStock > 0;
  // Clamp quantity to available stock on every render of the derived value.
  const qty = Math.min(Math.max(1, quantity), Math.max(1, maxStock));
  const lineTotal = String(Number(unitPrice) * qty);

  const wished = selectedVariant
    ? wishlistVariantIds.includes(selectedVariant.id)
    : false;

  /**
   * A value is available when, holding the *other* current selections fixed,
   * at least one in-stock variant carries this value. Disabling it otherwise
   * keeps the user on reachable combinations.
   */
  const isValueAvailable = (attrId: string, valueId: string): boolean => {
    const trial = { ...selection, [attrId]: valueId };
    return variants.some(
      (v) => v.stock > 0 && variantMatchesSelection(v, trial),
    );
  };

  const selectValue = (attrId: string, valueId: string) => {
    setSelection((prev) => ({ ...prev, [attrId]: valueId }));
    setQuantity(1);
    // Report the chosen value so the page can swap to its tagged image.
    onValueSelect?.(valueId);
  };

  const labelFor = (attrId: string): string | undefined => {
    const selectedId = selection[attrId];
    const attr = attributes.find((a) => a.id === attrId);
    return attr?.values.find((v) => v.id === selectedId)?.label;
  };

  // Human-readable selection, e.g. "Taille: L · Couleur: Rouge" — stored on the
  // guest cart line so the cart/checkout pages can show it without a server cart.
  const optionsLabel = attributes
    .map((a) => {
      const label = labelFor(a.id);
      return label ? `${a.name}: ${label}` : null;
    })
    .filter(Boolean)
    .join(' · ');

  const addLabel = !selectedVariant
    ? t('unavailable')
    : !inStock
      ? t('sold_out')
      : `${t('add_to_cart')} · ${formatPriceXAF(lineTotal, locale)}`;

  /** Guest add-to-cart: snapshot the line into localStorage, then go to /cart. */
  const addAsGuest = () => {
    if (!selectedVariant || !inStock) return;
    addGuestItem({
      variantId: selectedVariant.id,
      quantity: qty,
      productSlug,
      name,
      unitPrice: String(unitPrice),
      image: imageUrl,
      options: optionsLabel || undefined,
      maxStock,
    });
    router.push('/cart');
  };

  return (
    <div className="lg:sticky lg:top-28 lg:self-start">
      {eyebrow && eyebrow.length > 0 && (
        <p className="eyebrow mb-3.5">{eyebrow.filter(Boolean).join(' · ')}</p>
      )}
      <h1 className="mb-4 font-display text-h2">{name}</h1>
      <p className="mb-6 font-display text-h3 text-accent">
        {formatPriceXAF(unitPrice, locale)}
      </p>
      {shortDescription && (
        <p className="mb-8 max-w-[46ch] whitespace-pre-line font-body text-base leading-relaxed text-foreground">
          {shortDescription}
        </p>
      )}

      {/* Attribute selectors */}
      {attributes.map((attr) => (
        <div key={attr.id} className="mb-7">
          <div className="mb-3.5 flex items-center justify-between gap-4">
            <span className="eyebrow">{attr.name}</span>
            {attr.isSize && sizeGuideHash ? (
              <Link
                href={{ pathname: '/size-guides', hash: sizeGuideHash }}
                className="font-body text-small italic text-accent underline decoration-accent underline-offset-2 hover:text-accent-hover"
              >
                {t('size_guide')}
              </Link>
            ) : (
              <span className="font-display text-base text-foreground">
                {labelFor(attr.id)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {attr.values.map((val) => {
              const selected = selection[attr.id] === val.id;
              const available = isValueAvailable(attr.id, val.id);
              return (
                <button
                  key={val.id}
                  type="button"
                  onClick={() => available && selectValue(attr.id, val.id)}
                  disabled={!available}
                  aria-pressed={selected}
                  title={!available ? t('out_of_stock') : undefined}
                  className={[
                    'inline-flex min-w-[58px] items-center justify-center gap-2 border px-3.5 py-3 font-body text-base transition-colors',
                    selected
                      ? 'border-foreground bg-foreground text-background'
                      : available
                        ? 'border-border text-foreground hover:border-foreground'
                        : 'cursor-not-allowed border-border text-foreground-muted line-through',
                  ].join(' ')}
                >
                  {val.colorHex ? (
                    <span
                      aria-hidden
                      className={[
                        'inline-block h-4 w-4 rounded-full border',
                        selected ? 'border-background/60' : 'border-border',
                      ].join(' ')}
                      style={{ backgroundColor: val.colorHex }}
                    />
                  ) : (
                    !attr.isSize && (
                      <span
                        aria-hidden
                        className={[
                          'inline-block h-2.5 w-2.5 rounded-full border',
                          selected
                            ? 'border-background/40 bg-background'
                            : 'border-border bg-foreground-muted/40',
                        ].join(' ')}
                      />
                    )
                  )}
                  {val.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {hasStudio && (
        <p className="mb-8 font-body text-small text-foreground-muted">
          {t('custom_prefix')}{' '}
          <Link
            href="/studio"
            className="italic text-accent underline decoration-accent underline-offset-2 hover:text-accent-hover"
          >
            {t('custom_link')}
          </Link>
        </p>
      )}

      {/* Quantity + add to cart + wishlist */}
      <div className="mb-6 mt-2 flex flex-wrap items-stretch gap-3">
        <div className="inline-flex items-center border border-border">
          <button
            type="button"
            aria-label={t('decrease')}
            disabled={qty <= 1 || !inStock}
            onClick={() => setQuantity((n) => Math.max(1, n - 1))}
            className="flex h-14 w-11 items-center justify-center text-foreground hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
          <span className="min-w-[2rem] text-center font-display text-base tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            aria-label={t('increase')}
            disabled={qty >= maxStock || !inStock}
            onClick={() =>
              setQuantity((n) => Math.min(Math.max(1, maxStock), n + 1))
            }
            className="flex h-14 w-11 items-center justify-center text-foreground hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {isAuthenticated ? (
          <form action={addToCartAction} className="min-w-[12rem] flex-1">
            <input type="hidden" name="variantId" value={selectedVariant?.id ?? ''} />
            <input type="hidden" name="quantity" value={qty} />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="fromPath" value={fromPath} />
            <button
              type="submit"
              disabled={!inStock}
              aria-disabled={!inStock}
              className="btn btn-primary btn-block h-14 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addLabel}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={addAsGuest}
            disabled={!inStock}
            aria-disabled={!inStock}
            className="btn btn-primary btn-block h-14 min-w-[12rem] flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addLabel}
          </button>
        )}

        {selectedVariant && (
          <form action={wished ? removeFromWishlistAction : addToWishlistAction}>
            <input type="hidden" name="variantId" value={selectedVariant.id} />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="fromPath" value={fromPath} />
            <button
              type="submit"
              aria-label={wished ? t('wishlist_remove') : t('wishlist_add')}
              aria-pressed={wished}
              className={[
                'flex h-14 w-14 items-center justify-center border transition-colors',
                wished
                  ? 'border-accent bg-accent text-foreground-inverse'
                  : 'border-border text-foreground hover:border-accent hover:text-accent',
              ].join(' ')}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        )}
      </div>

      {/* Perks */}
      <ul className="mb-9 flex flex-col gap-2 font-body text-small text-foreground-muted">
        {[t('perks.delivery'), t('perks.returns'), t('perks.payment')].map(
          (perk) => (
            <li key={perk} className="flex gap-2.5">
              <span aria-hidden className="text-accent">
                —
              </span>
              <span>{perk}</span>
            </li>
          ),
        )}
      </ul>

      {/* Accordions */}
      <div className="border-t border-border">
        <Accordion
          summary={t('accordion.description')}
          body={longDescription?.trim() || t('accordion.description_body')}
          defaultOpen
        />
        <Accordion summary={t('accordion.care')} body={t('accordion.care_body')} />
        <Accordion summary={t('accordion.shipping')} body={t('accordion.shipping_body')} />
      </div>
    </div>
  );
}

function Accordion({
  summary,
  body,
  defaultOpen,
}: {
  summary: string;
  body: string;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between py-5 font-display text-base text-foreground [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <span
          aria-hidden
          className="font-body text-xl text-accent transition-transform duration-200 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="max-w-[56ch] pb-6 font-body text-small leading-relaxed text-foreground-muted">
        <p className="whitespace-pre-line">{body}</p>
      </div>
    </details>
  );
}
