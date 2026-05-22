/**
 * Celva design tokens — extracted from design/celva-brief-visuel.md
 * and design/css/celva.css (Brand Book v01, 2026).
 *
 * Used by both the storefront (Batch E) and admin (Batch D) so the
 * brand is consistent. Light mode is the default; dark mode uses the
 * `dark` class on <html> (Tailwind darkMode: 'class' in preset.js).
 *
 * Never use pure #fff or pure #000 — every neutral in the palette is warm.
 */

export const celvaColors = {
  // ─── Brand primaries ───
  terracotta: {
    DEFAULT: '#B26248',
    light: '#C4836B',   // hover state
    dark: '#8E4E3A',    // active state
  },
  beige: {
    DEFAULT: '#E8D9C6',
    light: '#F0E8DA',
    dark: '#D4C4AE',    // border in light mode
  },
  olive: {
    DEFAULT: '#595D40',
    light: '#6E7354',
    dark: '#3F422D',
  },

  // ─── Neutrals (warm — NEVER use #fff or #000) ───
  cream: '#FAF7F2',          // light-mode background
  ink: '#1A1A18',            // dark-mode background
  'ink-surface': '#262622',  // dark-mode card/surface
  'ink-border': '#3A3A35',   // dark-mode border

  gray: {
    DEFAULT: '#8C8680',      // secondary text, placeholders
    light: '#B5B0A9',
    dark: '#5C5955',
  },

  // ─── Functional ───
  whatsapp: '#25D366',
};

/**
 * Semantic tokens — point Tailwind utilities at meaning, not at hex.
 * The dark-mode equivalents are applied via `dark:` variants in components
 * (see preset.js for the dark-mode palette mapping).
 */
export const celvaSemantic = {
  background: celvaColors.cream,
  'background-alt': celvaColors.beige.DEFAULT,
  surface: celvaColors.beige.DEFAULT,
  foreground: celvaColors.olive.DEFAULT,
  'foreground-muted': celvaColors.gray.DEFAULT,
  'foreground-inverse': celvaColors.cream,
  border: celvaColors.beige.dark,
  accent: celvaColors.terracotta.DEFAULT,
  'accent-hover': celvaColors.terracotta.dark,
};

export const celvaFontFamily = {
  // Bodoni Moda: titles, prices, product names (replaces Didot)
  display: ['"Bodoni Moda"', '"Didot"', '"Times New Roman"', 'serif'],
  // Cormorant Garamond: body, navigation, buttons, labels (replaces Canela)
  body: ['"Cormorant Garamond"', '"Garamond"', 'Georgia', 'serif'],
  // Monospace label fallback (used inside image placeholders)
  mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
};

/**
 * Type scale (px) — desktop / mobile pairs from the brief §1.
 * In Tailwind we use rem; conversion 16px = 1rem.
 */
export const celvaFontSize = {
  caption: ['0.75rem', { lineHeight: '1', letterSpacing: '0.1em' }], // 12px uppercase eyebrow
  small: ['0.875rem', { lineHeight: '1.45' }],                         // 14px
  base: ['1rem', { lineHeight: '1.55' }],                              // 16px body
  lead: ['1.1875rem', { lineHeight: '1.55' }],                         // 19px lead paragraph
  h3: ['1.5rem', { lineHeight: '1.2' }],                               // 24px desktop, 20px mobile
  h2: ['2.25rem', { lineHeight: '1.1' }],                              // 36px desktop, 24px mobile
  h1: ['3rem', { lineHeight: '1.05' }],                                // 48px desktop, 32px mobile
  display: ['clamp(3.5rem, 7vw, 6.5rem)', { lineHeight: '0.98', letterSpacing: '-0.01em' }],
};

export const celvaLetterSpacing = {
  display: '-0.01em',
  tight: '-0.005em',
  eyebrow: '0.18em',
  caption: '0.1em',
  button: '0.16em',
  nav: '0.14em',
};

/**
 * Spacing — gutters (horizontal page padding) and section gaps.
 * Mapped onto Tailwind's standard spacing as semantic keys.
 */
export const celvaSpacing = {
  'gutter-mobile': '1.5rem',    // 24px
  'gutter-tablet': '3rem',      // 48px
  'gutter-desktop': '6rem',     // 96px
  'section-gap': '7rem',        // 112px
  'section-tight': '4.5rem',    // 72px
};

/**
 * Border radius — Celva uses sharp corners on buttons and cards as
 * part of the "haute couture" feel. Only badges and avatars are rounded.
 */
export const celvaBorderRadius = {
  none: '0',
  sm: '1px',
  pill: '999px',
  full: '999px',
};

export const celvaBoxShadow = {
  'card-hover': '0 8px 24px rgba(0, 0, 0, 0.06)',
  drawer: '0 24px 50px rgba(0, 0, 0, 0.16)',
  fab: '0 10px 30px rgba(0, 0, 0, 0.18)',
};

/**
 * Breakpoints — match the CSS in design/css/celva.css.
 * Tailwind defaults are sm:640 / md:768 / lg:1024 / xl:1280; Celva
 * uses 720 / 880 / 1080 instead — keep them so the design translates 1:1.
 */
export const celvaScreens = {
  sm: '720px',     // tablet up
  md: '880px',     // burger menu disappears here
  lg: '1080px',    // full desktop layout
  xl: '1440px',    // max-content width
};

export const celvaContainer = {
  center: true,
  screens: {
    sm: '720px',
    md: '880px',
    lg: '1080px',
    xl: '1440px',
  },
  padding: {
    DEFAULT: '1.5rem',  // mobile gutter
    sm: '3rem',         // tablet gutter
    lg: '6rem',         // desktop gutter
  },
};

export const celvaTransition = {
  DEFAULT: '200ms ease',
  color: '240ms ease',
  card: '300ms ease-out',
  drawer: '320ms cubic-bezier(0.4, 0, 0.2, 1)',
  image: '600ms ease',
};

export const celvaPatternOpacity = '0.04';
