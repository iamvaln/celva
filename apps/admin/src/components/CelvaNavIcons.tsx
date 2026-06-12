import type { ReactNode } from 'react';

/**
 * Navigation icons ported 1:1 from the design handoff (admin/icons.jsx) so the
 * sidebar matches the brand exactly — stroke, currentColor, 24px geometry.
 */
const Svg = ({ children, size = 19 }: { children: ReactNode; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {children}
  </svg>
);

export const NavDashboard = () => (
  <Svg>
    <path d="M3 13h7V3H3zM14 21h7V3h-7zM3 21h7v-6H3z" />
  </Svg>
);

export const NavSales = () => (
  <Svg>
    <rect x={3} y={4} width={18} height={4} />
    <path d="M5 8v12h14V8" />
    <path d="M9 12h6" />
  </Svg>
);

export const NavCatalog = () => (
  <Svg>
    <path d="M21 7.5 12 3 3 7.5l9 4.5 9-4.5z" />
    <path d="M3 7.5v9L12 21l9-4.5v-9" />
    <path d="M12 12v9" />
  </Svg>
);

export const NavStock = () => (
  <Svg>
    <rect x={3} y={8} width={18} height={13} />
    <path d="M3 8l3-5h12l3 5" />
    <path d="M9 12h6" />
  </Svg>
);

export const NavCommercial = () => (
  <Svg>
    <path d="M16 3h5v5" />
    <path d="M21 3l-8 8" />
    <path d="M11 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
  </Svg>
);

export const NavContent = () => (
  <Svg>
    <rect x={4} y={3} width={16} height={18} />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </Svg>
);

// Coin-stack / cylinder — the brand "Finance" mark (NOT a piggybank).
export const NavFinance = () => (
  <Svg>
    <path d="M3 6c0-1.1 4-2 9-2s9 .9 9 2-4 2-9 2-9-.9-9-2z" />
    <path d="M3 6v12c0 1.1 4 2 9 2s9-.9 9-2V6" />
    <path d="M3 12c0 1.1 4 2 9 2s9-.9 9-2" />
  </Svg>
);

export const NavSettings = () => (
  <Svg>
    <circle cx={12} cy={12} r={3} />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 13.4H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 6.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.4 3H10a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 .9 2.7H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </Svg>
);
