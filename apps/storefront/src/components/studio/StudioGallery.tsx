'use client';

import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import type { StudioModel } from '@/lib/studio';
import styles from '@/app/[locale]/studio/studio.module.css';

type GalleryItemWithModel = {
  id: string;
  imageKey: string;
  caption?: { fr?: string; en?: string } | null;
  isTall: boolean;
  modelSlug: string;
  modelName: string;
};

function flatten(models: StudioModel[], locale: Locale): GalleryItemWithModel[] {
  const items: GalleryItemWithModel[] = [];
  for (const m of models) {
    for (const g of m.galleryItems ?? []) {
      items.push({
        id: g.id,
        imageKey: g.imageKey,
        caption: g.caption ?? null,
        isTall: g.isTall,
        modelSlug: m.slug,
        modelName: m.name[locale] ?? m.name.fr,
      });
    }
  }
  return items;
}

export function StudioGallery({
  models,
  locale,
}: {
  models: StudioModel[];
  locale: Locale;
}) {
  const t = useTranslations('studio.gallery');
  const items = flatten(models, locale);
  if (items.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <div>
              <span className={styles.eyebrow}>{t('eyebrow')}</span>
              <h2>
                {t('title_a')}
                <br />
                <em>{t('title_em')}</em>
              </h2>
            </div>
            <p className={styles.sectionHeadNote}>{t('note')}</p>
          </header>
          <p className={styles.sectionHeadNote}>{t('empty')}</p>
        </div>
      </section>
    );
  }

  const pick = (slug: string) => {
    window.dispatchEvent(
      new CustomEvent('studio:pick-model', { detail: { modelSlug: slug } }),
    );
    const target = document.getElementById('composer');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <header className={styles.sectionHead}>
          <div>
            <span className={styles.eyebrow}>{t('eyebrow')}</span>
            <h2>
              {t('title_a')}
              <br />
              <em>{t('title_em')}</em>
            </h2>
          </div>
          <p className={styles.sectionHeadNote}>{t('note')}</p>
        </header>
        <div className={styles.galGrid}>
          {items.map((it) => (
            <figure
              key={it.id}
              className={`${styles.galCard} ${it.isTall ? styles.galCardTall : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.imageKey}
                alt={it.caption?.[locale] ?? it.caption?.fr ?? it.modelName}
                loading="lazy"
              />
              <figcaption className={styles.galCaption}>
                <span>{it.modelName}</span>
                <button type="button" onClick={() => pick(it.modelSlug)}>
                  {t('compose_cta')}
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
