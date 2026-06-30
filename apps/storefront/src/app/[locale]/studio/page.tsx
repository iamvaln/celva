import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { listStudioFamilies } from '@/lib/studio';
import { getPublicSettings, buildWhatsAppHref } from '@/lib/public-settings';
import { StudioBrowse } from '@/components/studio/StudioBrowse';
import styles from './studio.module.css';

type Params = { locale: Locale };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'studio.intro' });
  return {
    title: `${t('title_a')} ${t('title_em')}`,
    description: t('lede'),
  };
}

export default async function StudioPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'studio' });

  // One round-trip hydrates families + fabrics + garments + photos.
  // Degrades to [] if the API is down — StudioBrowse renders the empty
  // state then.
  const families = await listStudioFamilies(locale).catch(() => []);
  const settings = await getPublicSettings(locale);
  const whatsappHref = settings.contactWhatsapp
    ? buildWhatsAppHref(settings.contactWhatsapp)
    : null;

  return (
    <div className={styles.studioRoot}>
      <section className={styles.intro}>
        <div className={`${styles.container} ${styles.introInner}`}>
          <div className={styles.introHead}>
            <span className={styles.eyebrow}>{t('intro.eyebrow')}</span>
            <h1 className={styles.introTitle}>
              {t('intro.title_a')}
              <br />
              <em>{t('intro.title_em')}</em>
            </h1>
          </div>
          <p className={styles.introLede}>{t('intro.lede')}</p>
        </div>
      </section>

      <StudioBrowse families={families} locale={locale} />

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <div>
              <span className={styles.eyebrow}>{t('process.eyebrow')}</span>
              <h2>
                {t('process.title_a')}
                <em>{t('process.title_em')}</em>
              </h2>
            </div>
            <p className={styles.sectionHeadNote}>{t('process.note')}</p>
          </header>
          <ol className={styles.proc}>
            {[1, 2, 3, 4].map((n) => (
              <li key={n} className={styles.procStep}>
                <span className={styles.procNum}>{`0${n}`}</span>
                <h3>{t(`process.step_${n}_t` as 'process.step_1_t')}</h3>
                <p>{t(`process.step_${n}_b` as 'process.step_1_b')}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt} ${styles.sectionTight}`}>
        <div className={`${styles.container} ${styles.stylistGrid}`}>
          <div className={styles.stylistCopy}>
            <span className={styles.eyebrow}>{t('stylist.eyebrow')}</span>
            <h2>{t('stylist.title')}</h2>
            <p>{t('stylist.lead')}</p>
            <div className={styles.stylistActions}>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnPrimary}
                >
                  {t('stylist.whatsapp')}
                </a>
              )}
              <a href="#book" className={styles.btnSecondary}>
                {t('stylist.book_cta')}
              </a>
            </div>
          </div>
          <div className={styles.stylistFacts}>
            <div className={styles.fact}>
              <strong>{t('stylist.fact_weeks_n')}</strong>
              <span>{t('stylist.fact_weeks_l')}</span>
            </div>
            <div className={styles.fact}>
              <strong>{t('stylist.fact_alter_n')}</strong>
              <span>{t('stylist.fact_alter_l')}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
