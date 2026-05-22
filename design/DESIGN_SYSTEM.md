# Celva — Design System Reference

> Single source of truth for the storefront (Batch E). Distills `celva-brief-visuel.md`
> and `css/celva.css` into the smallest set of tokens, components, and rules a builder
> needs. **Read this once at the start of Batch E**, then refer back per section.
>
> If anything here disagrees with `celva-brief-visuel.md`, the brief wins —
> open an issue and update this file.

---

## 1. Palette

Never use pure `#fff` or pure `#000`. Every neutral is warm.

| Token | Hex | Use |
|---|---|---|
| `terracotta` | `#B26248` | CTAs, links, prices, badges |
| `terracotta-light` | `#C4836B` | hover (light mode) / accent in dark mode |
| `terracotta-dark` | `#8E4E3A` | active state |
| `beige` | `#E8D9C6` | alt section bg, cards (light mode) |
| `beige-light` | `#F0E8DA` | very subtle alt |
| `beige-dark` | `#D4C4AE` | border (light mode) |
| `olive` | `#595D40` | primary text, footer bg, headings (light mode) |
| `olive-light` | `#6E7354` | hover for olive |
| `olive-dark` | `#3F422D` | footer bg dark variant |
| `cream` `#FAF7F2` | light-mode background, dark-mode text |
| `ink` `#1A1A18` | dark-mode background |
| `ink-surface` `#262622` | dark-mode cards |
| `ink-border` `#3A3A35` | dark-mode border |
| `gray` `#8C8680` | secondary text, placeholders |

**Semantic tokens** (what you use in components — they switch automatically per mode):

| Token | Light | Dark |
|---|---|---|
| `background` | cream | ink |
| `background-alt` / `surface` | beige | ink-surface |
| `foreground` | olive | cream |
| `foreground-muted` | gray | gray-light |
| `border` | beige-dark | ink-border |
| `accent` | terracotta | terracotta (unchanged) |
| `accent-hover` | terracotta-dark | terracotta-light |

In Tailwind: prefer `bg-background text-foreground` over `bg-cream text-olive` so
`dark:` variants are free.

---

## 2. Typography

Two fonts, both auto-hosted via `next/font/local` (no Google CDN). Subset FR/EN.

| Family | Use | Weights |
|---|---|---|
| **Bodoni Moda** (display) | H1-H4, product names, prices, eyebrows in serif | 400, 700, 400italic |
| **Cormorant Garamond** (body) | paragraphs, buttons, nav, labels | 300, 400, 500, 600, 400italic |

**Type scale** (Tailwind keys → desktop / mobile):

| Key | Desktop | Mobile | Family |
|---|---|---|---|
| `text-display` | clamp 56 → 104 | clamp 56 → 104 | Bodoni Moda 400 |
| `text-h1` | 48 / line-height 1.05 | 32 | Bodoni Moda 700 |
| `text-h2` | 36 | 24 | Bodoni Moda 400 |
| `text-h3` | 24 | 20 | Bodoni Moda 400 |
| `text-lead` | 19 | 19 | Cormorant 400 |
| `text-base` | 16 | 16 | Cormorant 400 |
| `text-small` | 14 | 14 | Cormorant 400 |
| `text-caption` | 12 uppercase letter-spacing 0.1em | 12 | Cormorant 500 |

**Eyebrow style** (very common — section labels, nav, buttons): Cormorant
500, 12px, uppercase, `tracking-eyebrow` (0.18em).

---

## 3. Spacing & layout

| Token | Value | Use |
|---|---|---|
| `gutter-mobile` | 24px | horizontal page padding < 720px |
| `gutter-tablet` | 48px | 720–1080px |
| `gutter-desktop` | 96px | ≥ 1080px |
| `section-gap` | 112px | vertical padding between sections |
| `section-tight` | 72px | tighter sections |
| `max-w-content` | 1440px | global page max width |
| `max-w-prose` | 720px | static pages / blog body |

**Breakpoints** (Tailwind: `sm`, `md`, `lg`, `xl`):

| Tailwind | px | Trigger |
|---|---|---|
| `sm:` | 720 | tablet layout |
| `md:` | 880 | desktop nav (burger disappears) |
| `lg:` | 1080 | full desktop gutters |
| `xl:` | 1440 | max content width |

**Grid** (product catalog): mobile 2 / tablet 3 / desktop 4 columns, gap `40px 28px`
on desktop, `28px 16px` on mobile.

---

## 4. Components — minimal contract

Sharp corners (`rounded-none`) are the rule. Only badges and avatars are rounded.

| Component | Spec |
|---|---|
| **Button primary** | `bg-accent text-foreground-inverse hover:bg-accent-hover` · padding 16/32 · uppercase Cormorant 500 13px · `tracking-button` (0.16em) · transition 220ms |
| **Button secondary** | transparent bg · 1px `border-foreground` · hover swap fg/bg |
| **Button ghost** | underlined Cormorant 500 13px uppercase |
| **Input** | underline only (`border-b border-gray`), label above in Cormorant 14px gray, focus `border-accent` |
| **Product card** | image `aspect-product-portrait` (3:4), no border/shadow, hover `translateY(-4px)` + `shadow-card-hover`, name Bodoni 18 normal, price Bodoni 16 accent, old price `line-through text-gray` |
| **Badge** | terracotta bg, cream text, Cormorant 600 10px uppercase, 5/9 padding |
| **Card on dark** | `bg-ink-surface text-cream border-ink-border` |
| **Toast** | top-center, olive bg, cream text, auto-dismiss 4s, slide-in 320ms |
| **Drawer (mini-cart)** | right slide-in `transition-drawer`, width 420px max, full height, border-left |
| **Search overlay** | top slide-down, big italic Bodoni input (clamp 28→44px) |
| **Cookie banner** | bottom-left, 380px wide max, 22/24 padding, shadow-drawer |
| **WhatsApp FAB** | bottom-right, 56px circle, `#25D366`, `shadow-fab`, hide on scroll-down |

---

## 5. Page inventory (from `design/`)

Files already in the bundle — each maps to one or more Next.js routes in
`apps/storefront/src/app/[locale]/`.

| HTML file | Target route | Notes |
|---|---|---|
| `index.html` | `/` | Hero (100vh) + sélection vedette + bannière sur-mesure + collections + témoignages + newsletter + footer |
| `shop.html` | `/shop` | Catalog grid + sticky filter bar + "load more" pagination |
| `collection.html` | `/collections/[slug]` | 21:9 hero + grid |
| `product.html` | `/shop/[slug]` | 60/40 split desktop, mobile = swipe gallery + sticky CTA |
| `cart.html` | `/cart` | full cart page |
| `checkout.html` | `/checkout` | 3-step stepper, condensed header |
| `confirmation.html` | `/checkout/confirmation` | post-purchase |
| `login.html` | `/login` | minimal centered form |
| `signup.html` | `/signup` | minimal centered form |
| `account.html` | `/account` | nav lateral desktop / tabs mobile · Commandes, Wishlist, Adresses, Paiements, Profil |
| `article.html` | `/journal/[slug]` | blog article — narrow column |
| `aide.html` + `Celva - Aide (standalone).html` | `/aide` | help center with FAQ accordions |
| `404.html` | `not-found.tsx` | big "404" Bodoni Moda |
| `mobile.html` | reference | mobile-first composition tests |

Drawers / overlays that live on every page: `drawer` (mini-cart), `search-overlay`,
`mobile-menu`, `cookies`, `toast-stack`, `fab-whatsapp`.

---

## 6. Animation rules

Standard durations: **200ms** micro-interactions, **300ms** card/drawer transitions,
**400ms** image crossfade, **600ms** scroll fade-in.

Easing: `ease-out` for entries, `cubic-bezier(0.4, 0, 0.2, 1)` for drawers
(Tailwind: `ease-celva`).

Forbidden: parallax, auto-rotating sliders, agressive scroll animations, popups
(only the cookies banner).

Key keyframes already defined in the preset:
- `animate-fade-up` — opacity 0→1 + translateY 8→0, 600ms, used for section
  scroll-in (pair with IntersectionObserver).
- `animate-toast-slide` — opacity 0→1 + translateY -8→0, 320ms.

---

## 7. Assets

| Path | What |
|---|---|
| `design/assets/monogram.svg` | C+V monogram, single icon |
| `design/assets/monogram-pattern.svg` | repeating monogram pattern (160×160 tile), use at 3–5% opacity over hero/banner backgrounds |
| `design/logos/logo-celva*.png` | horizontal + standalone logos in olive/cream/noir variants |
| `design/logos/logo-celva.svg` (if present) | preferred — vector, inline as a React component |
| `design/favicon_io/*` | shipped to `apps/storefront/public/` |
| `design/screenshots/*` | reference images per page; not used at runtime |

---

## 8. What this preset gives you (Tailwind)

After `apps/storefront` adopts `@celva/tailwind-config/preset`:

```js
// apps/storefront/tailwind.config.js
import celva from '@celva/tailwind-config/preset';
export default { presets: [celva], content: ['./src/**/*.{ts,tsx}'] };
```

```css
/* apps/storefront/src/app/globals.css */
@import '@celva/tailwind-config/preset' /* see celvaCssVariables export */;
@tailwind base; @tailwind components; @tailwind utilities;
```

Available utilities you'll reach for most:

- Color: `bg-background bg-surface bg-accent text-foreground text-foreground-muted text-accent`
- Type: `font-display font-body text-display text-h1 text-eyebrow tracking-eyebrow tracking-button`
- Layout: `container` (centers + Celva gutters), `max-w-content max-w-prose`
- Spacing: `py-section-gap py-section-tight px-gutter-desktop`
- Cards: `aspect-product-portrait shadow-card-hover`
- Animation: `animate-fade-up animate-toast-slide ease-celva duration-drawer`

Dark mode: add the `dark` class on `<html>` (Next.js: `next-themes`).
Semantic tokens swap automatically via `:root` / `.dark` CSS vars — components
don't need `dark:` variants for them.

---

## 9. Open questions for Batch E

- Whether to render the storefront in fully static (SSG) for the homepage + product
  pages, or App Router server components hitting the API at request time.
  The brief leans toward "calm + fast" → SSG with ISR for product pages is the
  natural choice.
- Whether to ship Framer Motion or hand-roll the few animations with CSS only.
  Brief says "evaluate bundle impact" — start with CSS, add Framer only if a
  specific page needs it.
- next-intl 3 vs 4 (routing changed between majors) — pin in Batch E.
- Whether `shadcn/ui` primitives are worth pulling in for inputs / accordions /
  modals, or if the design's CSS components are tight enough to translate directly.
  Recommendation: skip shadcn for the storefront — the brief's components are
  visually opinionated and shadcn would force compromises.
