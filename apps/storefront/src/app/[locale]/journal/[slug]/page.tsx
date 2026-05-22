import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getArticleBySlug } from '@/lib/articles';
import { ApiError } from '@/lib/api';
import { pickLocalized } from '@/lib/catalogue';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const article = await getArticleBySlug(slug, locale);
    const title = pickLocalized(article.title, locale);
    const excerpt =
      article.excerpt && (article.excerpt.fr || article.excerpt.en)
        ? pickLocalized(
            { fr: article.excerpt.fr ?? '', en: article.excerpt.en ?? '' },
            locale,
          )
        : undefined;
    return {
      title: `${title} · Celva`,
      description: excerpt,
      openGraph: {
        title,
        description: excerpt,
        images: article.coverImage ? [article.coverImage] : undefined,
        type: 'article',
        publishedTime: article.publishedAt ?? undefined,
      },
    };
  } catch {
    return { title: 'Article · Celva' };
  }
}

const formatDate = (iso: string | null, locale: Locale): string => {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('journal');

  let article;
  try {
    article = await getArticleBySlug(slug, locale);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const title = pickLocalized(article.title, locale);
  const body = pickLocalized(article.content, locale);
  const excerpt =
    article.excerpt && (article.excerpt.fr || article.excerpt.en)
      ? pickLocalized(
          { fr: article.excerpt.fr ?? '', en: article.excerpt.en ?? '' },
          locale,
        )
      : null;

  return (
    <article className="bg-background py-section-tight">
      <div className="container-celva max-w-prose">
        <Link
          href="/journal"
          className="mb-8 inline-block font-body text-small uppercase tracking-eyebrow text-foreground-muted hover:text-accent"
        >
          ← {t('back_to_journal')}
        </Link>
        <header className="mb-10">
          <p className="eyebrow mb-3 text-accent">{t(`category.${article.category}`)}</p>
          <h1 className="mb-4 font-display text-h1">{title}</h1>
          {excerpt && (
            <p className="font-body text-lead text-foreground-muted">{excerpt}</p>
          )}
          {(article.publishedAt || article.author?.name) && (
            <p className="mt-6 font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
              {article.publishedAt && formatDate(article.publishedAt, locale)}
              {article.publishedAt && article.author?.name ? ' · ' : ''}
              {article.author?.name}
            </p>
          )}
        </header>

        {article.coverImage && (
          <div className="relative mb-12 aspect-[16/10] overflow-hidden bg-beige">
            <Image
              src={article.coverImage}
              alt={title}
              fill
              sizes="(max-width: 1024px) 100vw, 720px"
              priority
              className="object-cover"
            />
          </div>
        )}

        <div
          className="font-body text-base text-foreground
            [&_a]:text-accent [&_a:hover]:text-accent-hover [&_a]:underline
            [&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:font-display [&_blockquote]:text-lead [&_blockquote]:italic
            [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-h2
            [&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-h3
            [&_img]:my-8 [&_img]:w-full
            [&_li]:my-1
            [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6
            [&_p]:my-4 [&_p]:leading-relaxed
            [&_strong]:font-semibold
            [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
        >
          <Markdown remarkPlugins={[remarkGfm]} skipHtml>
            {body}
          </Markdown>
        </div>
      </div>
    </article>
  );
}
