import {
  celvaColors,
  celvaContainer,
  celvaFontFamily,
  celvaFontSize,
  celvaLetterSpacing,
  celvaScreens,
  celvaSpacing,
  celvaBorderRadius,
  celvaBoxShadow,
} from './tokens.js';

/**
 * Celva Tailwind preset.
 *
 * Light mode is the default; dark mode toggles via the `dark` class on
 * <html>. Apps that consume this preset:
 *   - apps/storefront (Next.js)  — Batch E
 *   - apps/admin (React-Admin)   — already running on a non-Tailwind
 *     MUI theme that pulls these tokens via the JS import (theme.ts).
 *
 * Components in the storefront should prefer the named tokens
 * (`text-foreground`, `bg-background`) over the brand palette
 * (`text-olive`, `bg-cream`) so dark mode just works via `dark:`
 * variants without rewriting markup.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  darkMode: 'class',
  theme: {
    screens: celvaScreens,
    container: celvaContainer,
    extend: {
      colors: {
        // Brand palette (named)
        ...celvaColors,
        // Semantic — light mode values; map to dark-mode equivalents in CSS
        // (the storefront sets these via :root + .dark in globals.css).
        background: 'rgb(var(--celva-background) / <alpha-value>)',
        'background-alt': 'rgb(var(--celva-background-alt) / <alpha-value>)',
        surface: 'rgb(var(--celva-surface) / <alpha-value>)',
        foreground: 'rgb(var(--celva-foreground) / <alpha-value>)',
        'foreground-muted': 'rgb(var(--celva-foreground-muted) / <alpha-value>)',
        'foreground-inverse': 'rgb(var(--celva-foreground-inverse) / <alpha-value>)',
        border: 'rgb(var(--celva-border) / <alpha-value>)',
        accent: 'rgb(var(--celva-accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--celva-accent-hover) / <alpha-value>)',
      },
      fontFamily: celvaFontFamily,
      fontSize: celvaFontSize,
      letterSpacing: celvaLetterSpacing,
      spacing: celvaSpacing,
      borderRadius: celvaBorderRadius,
      boxShadow: celvaBoxShadow,
      transitionDuration: {
        DEFAULT: '200ms',
        color: '240ms',
        card: '300ms',
        drawer: '320ms',
        image: '600ms',
      },
      transitionTimingFunction: {
        celva: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      maxWidth: {
        content: '1440px',
        prose: '720px',
        lead: '56ch',
      },
      aspectRatio: {
        'product-portrait': '3 / 4',
        'product-square': '1 / 1',
        'collection-banner': '21 / 9',
        'article-cover': '16 / 9',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-slide': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 600ms ease both',
        'toast-slide': 'toast-slide 320ms cubic-bezier(0.4, 0, 0.2, 1) both',
      },
    },
  },
};

/**
 * Drop this into apps/storefront/src/app/globals.css (or wherever the
 * storefront's root stylesheet lives). It wires the semantic Tailwind
 * tokens above to actual color values per mode. Keep RGB triplets so
 * Tailwind's `<alpha-value>` works (bg-foreground/40, etc.).
 */
export const celvaCssVariables = `
:root {
  --celva-background: 250 247 242;        /* cream */
  --celva-background-alt: 232 217 198;    /* beige */
  --celva-surface: 232 217 198;           /* beige */
  --celva-foreground: 89 93 64;           /* olive */
  --celva-foreground-muted: 140 134 128;  /* gray */
  --celva-foreground-inverse: 250 247 242;/* cream */
  --celva-border: 212 196 174;            /* beige-dark */
  --celva-accent: 178 98 72;              /* terracotta */
  --celva-accent-hover: 142 78 58;        /* terracotta-dark */
}
.dark {
  --celva-background: 26 26 24;           /* ink */
  --celva-background-alt: 38 38 34;       /* ink-surface */
  --celva-surface: 38 38 34;              /* ink-surface */
  --celva-foreground: 250 247 242;        /* cream */
  --celva-foreground-muted: 181 176 169;  /* gray-light */
  --celva-foreground-inverse: 250 247 242;/* cream */
  --celva-border: 58 58 53;               /* ink-border */
  --celva-accent: 178 98 72;              /* terracotta (unchanged) */
  --celva-accent-hover: 196 131 107;      /* terracotta-light */
}
`.trim();
