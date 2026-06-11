/** Celva "C+V" monogram mark (from the design handoff monogram.svg). */
export const CelvaMonogram = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth={7.5}
    strokeLinecap="butt"
    strokeLinejoin="miter"
    aria-hidden
  >
    <path d="M 66 27.3 A 32 32 0 1 1 34 27.3" />
    <path d="M 24 8 L 50 78 L 74 6" />
    <path d="M 84 6 L 91 1" strokeWidth={6.5} />
  </svg>
);
