import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Locale } from '@/i18n/routing';
import { listSizeGuides } from '@/lib/size-guides';
import { pickLocalized } from '@/lib/catalogue';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'size_guides' });
  return { title: t('title'), description: t('intro') };
}

export default async function SizeGuidesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('size_guides');
  // Tolerate the API being unreachable at build time (ISR fills it in at
  // runtime) — matches how the catalogue pages fail soft during prerender.
  const guides = await listSizeGuides(locale).catch(() => []);

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva">
        <header className="mb-12 max-w-3xl">
          <p className="eyebrow mb-2">{t('eyebrow')}</p>
          <h1 className="mb-4 font-display text-h1">{t('title')}</h1>
          <p className="font-body text-lead text-foreground-muted">{t('intro')}</p>
        </header>

        {guides.length === 0 ? (
          <p className="font-body text-base text-foreground-muted">{t('empty')}</p>
        ) : (
          <div className="space-y-16">
            {guides.map((guide) => (
              <article key={guide.id} id={`guide-${guide.categoryId}`} className="scroll-mt-28">
                <h2 className="mb-2 font-display text-h3">{pickLocalized(guide.name, locale)}</h2>
                {guide.category && (
                  <p className="eyebrow mb-4">{pickLocalized(guide.category.name, locale)}</p>
                )}
                <div
                  className="font-body text-base text-foreground
                    [&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-h3
                    [&_p]:my-4 [&_p]:leading-relaxed
                    [&_strong]:font-semibold
                    [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1
                    [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-small
                    [&_th]:border [&_th]:border-foreground/15 [&_th]:bg-background-alt [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
                    [&_td]:border [&_td]:border-foreground/15 [&_td]:px-3 [&_td]:py-2"
                >
                  <Markdown remarkPlugins={[remarkGfm]} skipHtml>
                    {pickLocalized(guide.content, locale)}
                  </Markdown>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
