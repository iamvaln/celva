import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AnnounceBar } from '@/components/AnnounceBar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CookieBanner } from '@/components/CookieBanner';
import { FabWhatsapp } from '@/components/FabWhatsapp';
import { JsonLd } from '@/components/JsonLd';
import { organizationLd, websiteLd } from '@/lib/structured-data';

export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://celva.store';
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t('title'), template: t('title_template') },
    description: t('description'),
    alternates: {
      canonical: '/',
      languages: { fr: '/fr', en: '/en' },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      siteName: 'Celva',
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      type: 'website',
      url: siteUrl,
    },
    twitter: { card: 'summary_large_image', title: t('title'), description: t('description') },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: 'common' });

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <JsonLd data={organizationLd()} />
      <JsonLd data={websiteLd()} />
      <ThemeProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-accent focus:px-4 focus:py-2 focus:text-cream"
        >
          {t('skip_to_content')}
        </a>
        <AnnounceBar />
        <Header />
        <main id="main" className="min-h-[60vh] animate-fade-up">
          {children}
        </main>
        <Footer />
        <CookieBanner />
        <FabWhatsapp locale={locale} />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
