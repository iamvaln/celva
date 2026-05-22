import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'always',
  pathnames: {
    '/': '/',
    '/shop': { fr: '/boutique', en: '/shop' },
    '/shop/[slug]': { fr: '/boutique/[slug]', en: '/shop/[slug]' },
    '/collections/[slug]': { fr: '/collections/[slug]', en: '/collections/[slug]' },
    '/cart': { fr: '/panier', en: '/cart' },
    '/wishlist': { fr: '/favoris', en: '/wishlist' },
    '/checkout': { fr: '/commande', en: '/checkout' },
    '/checkout/confirmation/[orderNumber]': {
      fr: '/commande/confirmation/[orderNumber]',
      en: '/checkout/confirmation/[orderNumber]',
    },
    '/account': { fr: '/compte', en: '/account' },
    '/account/orders': { fr: '/compte/commandes', en: '/account/orders' },
    '/account/orders/[orderNumber]': {
      fr: '/compte/commandes/[orderNumber]',
      en: '/account/orders/[orderNumber]',
    },
    '/account/addresses': { fr: '/compte/adresses', en: '/account/addresses' },
    '/account/payment-methods': {
      fr: '/compte/methodes-paiement',
      en: '/account/payment-methods',
    },
    '/login': { fr: '/connexion', en: '/login' },
    '/signup': { fr: '/inscription', en: '/signup' },
    '/forgot-password': {
      fr: '/mot-de-passe-oublie',
      en: '/forgot-password',
    },
    '/reset-password': {
      fr: '/reinitialiser-mot-de-passe',
      en: '/reset-password',
    },
    '/account/profile': { fr: '/compte/profil', en: '/account/profile' },
    '/journal': { fr: '/journal', en: '/journal' },
    '/journal/[slug]': { fr: '/journal/[slug]', en: '/journal/[slug]' },
    '/aide': { fr: '/aide', en: '/help' },
    '/about': { fr: '/a-propos', en: '/about' },
    '/process': { fr: '/processus', en: '/process' },
    '/faq': { fr: '/faq', en: '/faq' },
    '/contact': { fr: '/contact', en: '/contact' },
    '/terms': { fr: '/cgv', en: '/terms' },
    '/privacy': { fr: '/confidentialite', en: '/privacy' },
  },
});

export type Locale = (typeof routing.locales)[number];
