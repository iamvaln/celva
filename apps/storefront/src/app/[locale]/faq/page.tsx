import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

type FAQItem = { q: string; a: string };

export default async function FaqPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('static.faq');
  const messages = (await getMessages()) as unknown as { static: { faq: { items: FAQItem[] } } };
  const items = messages.static.faq.items;

  return (
    <article className="container-celva max-w-prose py-section-gap">
      <header className="mb-12">
        <h1 className="mb-4 font-display text-h1">{t('title')}</h1>
        <p className="font-body text-lead text-foreground-muted">{t('subtitle')}</p>
      </header>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((item) => (
          <li key={item.q}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-display text-h3 text-foreground transition-colors hover:text-accent">
                <span>{item.q}</span>
                <span className="text-accent transition-transform duration-color group-open:rotate-45" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="pb-6 font-body text-base leading-relaxed text-foreground-muted">{item.a}</p>
            </details>
          </li>
        ))}
      </ul>
    </article>
  );
}
