type MonogramProps = {
  className?: string;
  title?: string;
};

/**
 * Celva C+V monogram. Currently a placeholder vector that matches the
 * brief's vertical-stroke style. Swap with the real SVG from
 * design/assets/monogram.svg when the production asset lands in
 * apps/storefront/public/.
 *
 * Intentionally narrow props (no ref/spread) — keeps it React-18/19
 * dual-types-friendly while the admin app still ships React 18.
 */
export const Monogram = ({ className, title }: MonogramProps) => (
  <svg
    viewBox="0 0 64 64"
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="square"
    className={className}
  >
    {title ? <title>{title}</title> : null}
    <path d="M50 18a16 16 0 0 0-16-8c-9 0-16 7-16 16v8c0 9 7 16 16 16a16 16 0 0 0 16-8" />
    <path d="M14 14l10 36 8 0 10-36" />
  </svg>
);
