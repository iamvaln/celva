'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { PHONE_CAMEROON_PATTERN, STUDIO_APPT_SLOTS } from '@celva/shared';
import type { Locale } from '@/i18n/routing';
import type { StudioFamily, StudioRequestPayload } from '@/lib/studio';
import { submitStudioRequest } from '@/app/[locale]/studio/actions';
import styles from '@/app/[locale]/studio/studio.module.css';

type Props = {
  families: StudioFamily[];
  locale: Locale;
};

const phoneRe = new RegExp(PHONE_CAMEROON_PATTERN);

// Tomorrow as min date for the appointment picker.
const tomorrowIso = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const pickLocalized = (
  json: { fr?: string; en?: string } | null | undefined,
  locale: Locale,
): string => json?.[locale] ?? json?.fr ?? json?.en ?? '';

export function StudioBrowse({ families, locale }: Props) {
  const t = useTranslations('studio');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearSelection = () => setSelected(new Set());

  // Empty states + per-family rendering live in the same client tree
  // (single context for selection state).
  if (families.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.container}>
          <p className={styles.guide}>{t('browse.empty_families')}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      {families.map((family) => (
        <FamilySection
          key={family.id}
          family={family}
          locale={locale}
          selected={selected}
          onToggle={toggle}
        />
      ))}

      <RdvFormSection
        locale={locale}
        families={families}
        selected={selected}
        onClear={clearSelection}
      />

      <StickyCta selectedCount={selected.size} t={t} />
    </>
  );
}

function FamilySection({
  family,
  locale,
  selected,
  onToggle,
}: {
  family: StudioFamily;
  locale: Locale;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const t = useTranslations('studio');
  const familyName = pickLocalized(family.name, locale);
  const familyDescription = pickLocalized(family.description, locale);

  // Flatten garments → photos, but tag each photo with its garment so
  // the carousel can show the garment name on hover/caption.
  const garmentPhotos = useMemo(
    () =>
      family.garments.flatMap((g) =>
        g.photos.map((p) => ({
          photoId: p.id,
          garmentId: g.id,
          imageKey: p.imageKey,
          caption: pickLocalized(p.caption, locale),
          garmentName: pickLocalized(g.name, locale),
        })),
      ),
    [family.garments, locale],
  );

  return (
    <section className={styles.section} id={`family-${family.slug}`}>
      <div className={styles.container}>
        <header className={styles.familyHead}>
          <div>
            <p className={styles.eyebrow}>{t('browse.family_eyebrow')}</p>
            <h2 className={styles.familyTitle}>{familyName}</h2>
            {familyDescription && (
              <p className={styles.familyDescription}>{familyDescription}</p>
            )}
          </div>
          {family.coverImage && (
            <div className={styles.familyCover}>
              <Image
                src={family.coverImage}
                alt={familyName}
                fill
                sizes="(max-width: 1024px) 100vw, 380px"
                className={styles.familyCoverImg}
              />
            </div>
          )}
        </header>

        {garmentPhotos.length > 0 && (
          <>
            <p className={styles.subEyebrow}>{t('browse.garments_label')}</p>
            <div className={styles.garmentCarousel}>
              {garmentPhotos.map((p) => (
                <figure key={p.photoId} className={styles.garmentCard}>
                  <div className={styles.garmentImageWrap}>
                    <Image
                      src={p.imageKey}
                      alt={p.garmentName}
                      fill
                      sizes="(max-width: 768px) 70vw, 260px"
                      className={styles.garmentImage}
                    />
                  </div>
                  <figcaption className={styles.garmentCaption}>
                    <span className={styles.garmentName}>{p.garmentName}</span>
                    {p.caption && (
                      <span className={styles.garmentSubcaption}>{p.caption}</span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}

        {family.fabrics.length > 0 && (
          <>
            <p className={styles.subEyebrow}>{t('browse.fabrics_label')}</p>
            <ul className={styles.fabricGrid}>
              {family.fabrics.map((f) => {
                const isSelected = selected.has(f.id);
                const fabricName = pickLocalized(f.name, locale);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => onToggle(f.id)}
                      aria-pressed={isSelected}
                      className={`${styles.fabricTile} ${isSelected ? styles.fabricTileOn : ''}`}
                    >
                      <div className={styles.fabricSwatchWrap}>
                        {f.swatchImage && (
                          <Image
                            src={f.swatchImage}
                            alt={fabricName}
                            fill
                            sizes="(max-width: 768px) 40vw, 200px"
                            className={styles.fabricSwatch}
                          />
                        )}
                        {isSelected && <span className={styles.fabricCheck}>✓</span>}
                      </div>
                      <span className={styles.fabricName}>{fabricName}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function StickyCta({
  selectedCount,
  t,
}: {
  selectedCount: number;
  t: ReturnType<typeof useTranslations<'studio'>>;
}) {
  return (
    <div className={styles.stickyCta} aria-live="polite">
      <span className={styles.stickyLabel}>
        {selectedCount === 0
          ? t('cta.empty')
          : t('cta.count', { count: selectedCount })}
      </span>
      <a href="#book" className={styles.stickyButton}>
        {selectedCount === 0 ? t('cta.book_empty') : t('cta.book_with_selection')}
      </a>
    </div>
  );
}

const rdvSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().regex(phoneRe, 'errors.invalid_phone'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  appointmentMode: z.enum(['ATELIER', 'VISIO']),
  appointmentDate: z.string().min(1),
  appointmentSlot: z.enum(STUDIO_APPT_SLOTS),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

type RdvForm = z.infer<typeof rdvSchema>;

function RdvFormSection({
  locale,
  families,
  selected,
  onClear,
}: {
  locale: Locale;
  families: StudioFamily[];
  selected: Set<string>;
  onClear: () => void;
}) {
  const t = useTranslations('studio');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>(
    'idle',
  );

  // Resolve labels for picked fabrics so the form can summarise the selection.
  const selectedLabels = useMemo(() => {
    const out: string[] = [];
    for (const family of families) {
      const familyName = pickLocalized(family.name, locale);
      for (const f of family.fabrics) {
        if (selected.has(f.id)) {
          out.push(`${familyName} · ${pickLocalized(f.name, locale)}`);
        }
      }
    }
    return out;
  }, [families, selected, locale]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RdvForm>({
    resolver: zodResolver(rdvSchema),
    defaultValues: {
      appointmentMode: 'ATELIER',
      appointmentDate: tomorrowIso(),
      appointmentSlot: STUDIO_APPT_SLOTS[2],
    },
  });

  const onSubmit = async (values: RdvForm) => {
    setStatus('submitting');
    const payload: StudioRequestPayload = {
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      customerEmail: values.customerEmail?.trim()
        ? values.customerEmail.trim()
        : undefined,
      appointmentMode: values.appointmentMode,
      appointmentDate: values.appointmentDate,
      appointmentSlot: values.appointmentSlot,
      selectedFabricIds: Array.from(selected),
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    };
    try {
      await submitStudioRequest(payload, locale);
      setStatus('success');
      reset();
      onClear();
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <section className={styles.section} id="book">
        <div className={`${styles.container} ${styles.rdvSuccess}`}>
          <p className={styles.eyebrow}>{t('rdv.success_eyebrow')}</p>
          <h2 className={styles.rdvSuccessTitle}>{t('rdv.success_title')}</h2>
          <p className={styles.rdvSuccessBody}>{t('rdv.success_body')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section} id="book">
      <div className={styles.container}>
        <header className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>{t('rdv.eyebrow')}</p>
            <h2 className={styles.rdvTitle}>{t('rdv.title')}</h2>
            <p className={styles.rdvLede}>{t('rdv.lede')}</p>
          </div>
        </header>

        {selectedLabels.length > 0 && (
          <div className={styles.rdvSummary}>
            <p className={styles.subEyebrow}>{t('rdv.selection_label')}</p>
            <ul className={styles.rdvSummaryList}>
              {selectedLabels.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.rdvForm} noValidate>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t('rdv.fields.name')} *</span>
            <input type="text" {...register('customerName')} className={styles.input} />
            {errors.customerName && (
              <span className={styles.fieldError}>{t('rdv.errors.required')}</span>
            )}
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t('rdv.fields.phone')} *</span>
            <input
              type="tel"
              placeholder="+237 6XX XX XX XX"
              {...register('customerPhone')}
              className={styles.input}
            />
            {errors.customerPhone && (
              <span className={styles.fieldError}>{t('rdv.errors.phone')}</span>
            )}
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t('rdv.fields.email')}</span>
            <input
              type="email"
              {...register('customerEmail')}
              className={styles.input}
            />
            {errors.customerEmail && (
              <span className={styles.fieldError}>{t('rdv.errors.email')}</span>
            )}
          </label>

          <div className={styles.fieldRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t('rdv.fields.mode')} *</span>
              <select {...register('appointmentMode')} className={styles.input}>
                <option value="ATELIER">{t('rdv.mode.atelier')}</option>
                <option value="VISIO">{t('rdv.mode.visio')}</option>
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t('rdv.fields.date')} *</span>
              <input
                type="date"
                min={tomorrowIso()}
                {...register('appointmentDate')}
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t('rdv.fields.slot')} *</span>
              <select {...register('appointmentSlot')} className={styles.input}>
                {STUDIO_APPT_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t('rdv.fields.notes')}</span>
            <textarea
              {...register('notes')}
              rows={4}
              className={styles.textarea}
              placeholder={t('rdv.notes_placeholder')}
            />
          </label>

          <div className={styles.rdvActions}>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? t('rdv.submitting') : t('rdv.submit')}
            </button>
            {status === 'error' && (
              <span className={styles.fieldError}>{t('rdv.errors.submit')}</span>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
