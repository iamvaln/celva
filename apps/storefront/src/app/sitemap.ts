import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

const STATIC_ROUTES = [
  '/',
  '/shop',
  '/about',
  '/process',
  '/faq',
  '/contact',
  '/terms',
  '/privacy',
  '/login',
  '/signup',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://celva.store';
  const lastModified = new Date();
  return STATIC_ROUTES.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${route === '/' ? '' : route}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: route === '/' ? 1 : 0.6,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${base}/${l}${route === '/' ? '' : route}`]),
        ),
      },
    })),
  );
}
