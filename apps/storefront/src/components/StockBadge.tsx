import { useTranslations } from 'next-intl';

/**
 * Consistent stock affordance across product detail, cart, and wishlist.
 *
 * Visual hierarchy inverted from the previous inline pattern:
 *  - low-stock (1..LOW_THRESHOLD) = bordered accent pill → buy urgency.
 *  - unavailable                  = muted text       → low attention, "skip this".
 *
 * Returns null for healthy stock so callers can drop it in without
 * worrying about empty space.
 */

const LOW_STOCK_THRESHOLD = 3;

export type StockBadgeProps = {
  /** Authoritative available count (variant.stock or cart line's stockAvailable). */
  stock: number;
  /**
   * Optional override for the unavailable state — variant could be
   * deactivated even with stock > 0, or a cart item could be flagged
   * isAvailable=false. Defaults to `stock > 0`.
   */
  isAvailable?: boolean;
};

export const StockBadge = ({ stock, isAvailable }: StockBadgeProps) => {
  const t = useTranslations('cart');
  const available = isAvailable ?? stock > 0;

  if (!available) {
    return (
      <span className="inline-block font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
        {t('unavailable')}
      </span>
    );
  }

  if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="inline-block border border-accent px-2 py-0.5 font-body text-caption uppercase tracking-eyebrow text-accent">
        {t('low_stock', { n: stock })}
      </span>
    );
  }

  return null;
};
