/**
 * Celva design tokens shared across storefront, admin, and delivery apps.
 * Values mirror prefers-color-scheme and the class-based dark strategy.
 */
export const celvaTokens = {
  colors: {
    celva: {
      ink: 'hsl(220 30% 12%)',
      ivory: 'hsl(36 33% 96%)',
      gold: 'hsl(38 65% 50%)',
      rose: 'hsl(348 60% 65%)',
      muted: 'hsl(220 10% 45%)',
    },
  },
  fontFamily: {
    sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
    serif: ['var(--font-serif)', 'Georgia', 'serif'],
  },
  borderRadius: {
    celva: '0.75rem',
  },
};
