import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { type ArticleCategory, listArticles } from '@/lib/articles';
import { pickLocalized } from '@/lib/catalogue';

type SearchParams = {
  category?: string;
  page?: string;
};

const CATEGORIES: ArticleCategory[] = ['STYLE', 'BEHIND_THE_SCENES', 'EVENTS', 'GUIDES'];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'journal' });
  return { title: t('title'), description: t('subtitle') };
}

const formatDate = (iso: string | null, locale: Locale): string => {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
};

export default async function JournalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations('journal');

  const category =
    sp.category && (CATEGORIES as string[]).includes(sp.category)
      ? (sp.category as ArticleCategory)
      : undefined;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  const result = await listArticles({ page, category }, locale);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  const buildHref = (next: { category?: string; page?: number }): string => {
    const qs = new URLSearchParams();
    const cat = next.category ?? category;
    if (cat) qs.set('category', cat);
    const p = next.page ?? page;
    if (p > 1) qs.set('page', String(p));
    const query = qs.toString();
    return query ? `?${query}` : '';
  };

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva">
        <header className="mb-12 max-w-3xl">
          <p className="eyebrow mb-2">{t('eyebrow')}</p>
          <h1 className="mb-3 font-display text-h1">{t('title')}</h1>
          <p className="font-body text-lead text-foreground-muted">{t('subtitle')}</p>
        </header>

        {/* Category filter */}
        <nav
          aria-label={t('filters_aria')}
          className="mb-10 flex flex-wrap items-center gap-3 border-y border-border py-4"
        >
          <a
            href={buildHref({ category: '' })}
            className={`font-body text-small uppercase tracking-eyebrow ${
              category === undefined ? 'text-accent' : 'text-foreground-muted hover:text-accent'
            }`}
          >
            {t('all')}
          </a>
          {CATEGORIES.map((c) => (
            <a
              key={c}
              href={buildHref({ category: c })}
              className={`font-body text-small uppercase tracking-eyebrow ${
                category === c ? 'text-accent' : 'text-foreground-muted hover:text-accent'
              }`}
            >
              {t(`category.${c}`)}
            </a>
          ))}
        </nav>

        {/* List */}
        {result.data.length === 0 ? (
          <p className="border border-border bg-background-alt p-12 text-center font-body text-base text-foreground-muted">
            {t('empty')}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {result.data.map((article) => (
              <li key={article.id}>
                <Link
                  href={{ pathname: '/journal/[slug]', params: { slug: article.slug } }}
                  className="group block"
                >
                  <div className="relative mb-4 aspect-product-portrait overflow-hidden bg-beige">
                    {article.coverImage && (
                      <Image
                        src={article.coverImage}
                        alt={pickLocalized(article.title, locale)}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-image group-hover:scale-105"
                      />
                    )}
                  </div>
                  <p className="font-body text-caption uppercase tracking-eyebrow text-accent">
                    {t(`category.${article.category}`)}
                  </p>
                  <h2 className="mt-2 font-display text-h3 text-foreground group-hover:text-accent">
                    {pickLocalized(article.title, locale)}
                  </h2>
                  {article.excerpt &&
                    (article.excerpt.fr || article.excerpt.en) && (
                      <p className="mt-2 line-clamp-3 font-body text-base text-foreground-muted">
                        {pickLocalized(
                          {
                            fr: article.excerpt.fr ?? '',
                            en: article.excerpt.en ?? '',
                          },
                          locale,
                        )}
                      </p>
                    )}
                  {article.publishedAt && (
                    <p className="mt-3 font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
                      {formatDate(article.publishedAt, locale)}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav
            aria-label={t('pagination_aria')}
            className="mt-12 flex items-center justify-center gap-6 font-body text-small"
          >
            {page > 1 && (
              <a href={buildHref({ page: page - 1 })} className="hover:text-accent">
                ← {t('previous')}
              </a>
            )}
            <span className="text-foreground-muted">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <a href={buildHref({ page: page + 1 })} className="hover:text-accent">
                {t('next')} →
              </a>
            )}
          </nav>
        )}
      </div>
    </section>
  );
}
