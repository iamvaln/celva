'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  STUDIO_APPT_SLOTS,
  STUDIO_HEIGHT_RANGE,
  STUDIO_SIZES,
  STUDIO_SIZE_REFS,
  STUDIO_TEINTS,
} from '@celva/shared';
import type { Locale } from '@/i18n/routing';
import type { StudioFabric, StudioModel } from '@/lib/studio';
import styles from '@/app/[locale]/studio/studio.module.css';

type Pane = 'order' | 'appt';
type Gender = 'femme' | 'homme';

type Props = {
  models: StudioModel[];
  locale: Locale;
};

type SuccessState =
  | { kind: 'order'; title: string; body: string }
  | { kind: 'appt'; title: string; body: string }
  | null;

const fmtFCFA = (n: string | number): string =>
  `${new Intl.NumberFormat('fr-FR').format(Number(n))} FCFA`;

const pickFr = (
  bilingual: { fr?: string; en?: string } | null | undefined,
  locale: Locale,
): string => bilingual?.[locale] ?? bilingual?.fr ?? bilingual?.en ?? '';

export function StudioConfigurator({ models, locale }: Props) {
  const t = useTranslations('studio');

  if (models.length === 0) {
    return (
      <section className={styles.composer}>
        <div className={styles.container}>
          <p className={styles.guide}>{t('configurator.empty_models')}</p>
        </div>
      </section>
    );
  }

  return <Configurator models={models} locale={locale} t={t} />;
}

function Configurator({
  models,
  locale,
  t,
}: Props & { t: ReturnType<typeof useTranslations<'studio'>> }) {
  const [modelId, setModelId] = useState(models[0]!.id);
  const [fabricId, setFabricId] = useState(models[0]!.fabrics[0]?.id ?? '');
  const [gender, setGender] = useState<Gender>('femme');
  const [teint, setTeint] = useState(4);
  const [size, setSize] = useState<(typeof STUDIO_SIZES)[number]>('M');
  const [height, setHeight] = useState<number>(STUDIO_HEIGHT_RANGE.default);
  const [pane, setPane] = useState<Pane>('order');
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState<SuccessState>(null);

  const model = useMemo(
    () => models.find((m) => m.id === modelId) ?? models[0]!,
    [models, modelId],
  );
  const fabric = useMemo<StudioFabric | null>(
    () => model.fabrics.find((f) => f.id === fabricId) ?? model.fabrics[0] ?? null,
    [model, fabricId],
  );
  // Keep state coherent when model changes (different fabric set).
  useEffect(() => {
    if (!fabric && model.fabrics.length > 0) setFabricId(model.fabrics[0]!.id);
  }, [model, fabric]);

  // Render-overlay theatre on any selection change.
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerOverlay = () => {
    setGenerating(true);
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => setGenerating(false), 650);
  };

  // ── Cross-component preselection from the gallery (data-pick-model + scroll). ──
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ modelSlug: string }>).detail;
      const target = models.find((m) => m.slug === detail.modelSlug);
      if (!target) return;
      setModelId(target.id);
      setFabricId(target.fabrics[0]?.id ?? '');
      triggerOverlay();
    };
    window.addEventListener('studio:pick-model', handler);
    return () => window.removeEventListener('studio:pick-model', handler);
  }, [models]);

  if (success) {
    return (
      <section className={styles.composer} id="composer">
        <div className={styles.container}>
          <div className={styles.success}>
            <div className={styles.successMark}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>{success.title}</h3>
            <p>{success.body}</p>
            <button
              type="button"
              className={styles.successBack}
              onClick={() => setSuccess(null)}
            >
              {t('success.back')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const teintInfo = STUDIO_TEINTS[teint] ?? STUDIO_TEINTS[0]!;
  const previewSrc = fabric?.photoImage ?? model.coverImage ?? '';

  return (
    <section className={styles.composer} id="composer">
      <div className={styles.container}>
        <p className={styles.guide}>{t('configurator.guide')}</p>

        <div className={styles.cfg}>
          {/* LEFT — silhouette + coupe */}
          <div className={styles.cfgLeft}>
            <fieldset className={styles.col}>
              <legend className={styles.colTitle}>
                <span className={styles.colNum}>01</span> {t('configurator.col_silhouette')}
              </legend>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>{t('configurator.field_genre')}</span>
                <div className={styles.seg}>
                  {(['femme', 'homme'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`${styles.segBtn} ${gender === g ? styles.segActive : ''}`}
                      onClick={() => {
                        setGender(g);
                        triggerOverlay();
                      }}
                    >
                      {t(`configurator.gender_${g}` as 'configurator.gender_femme' | 'configurator.gender_homme')}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>{t('configurator.field_teint')}</span>
                <div className={styles.teints}>
                  {STUDIO_TEINTS.map((tone, i) => (
                    <button
                      key={tone.hex}
                      type="button"
                      aria-label={tone.name[locale]}
                      title={tone.name[locale]}
                      style={{ background: tone.hex }}
                      className={`${styles.teint} ${i === teint ? styles.teintActive : ''}`}
                      onClick={() => {
                        setTeint(i);
                        triggerOverlay();
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>{t('configurator.field_size')}</span>
                <div className={`${styles.seg} ${styles.segSizes}`}>
                  {STUDIO_SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.segBtn} ${size === s ? styles.segActive : ''}`}
                      onClick={() => {
                        setSize(s);
                        triggerOverlay();
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>
                  {t('configurator.field_height')} <em>{height} {t('configurator.height_unit')}</em>
                </span>
                <input
                  type="range"
                  className={styles.range}
                  min={STUDIO_HEIGHT_RANGE.min}
                  max={STUDIO_HEIGHT_RANGE.max}
                  step={1}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  onMouseUp={triggerOverlay}
                  onTouchEnd={triggerOverlay}
                />
                <div className={styles.rangeTicks}>
                  <span>{STUDIO_HEIGHT_RANGE.min}</span>
                  <span>{STUDIO_HEIGHT_RANGE.max} {t('configurator.height_unit')}</span>
                </div>
              </div>
            </fieldset>

            <fieldset className={styles.col}>
              <legend className={styles.colTitle}>
                <span className={styles.colNum}>02</span> {t('configurator.col_coupe')}
              </legend>
              <div className={styles.colList}>
                {models.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`${styles.pick} ${m.id === modelId ? styles.pickActive : ''}`}
                    onClick={() => {
                      if (m.id !== modelId) {
                        setModelId(m.id);
                        setFabricId(m.fabrics[0]?.id ?? '');
                        triggerOverlay();
                      }
                    }}
                  >
                    {m.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.coverImage} alt="" />
                    ) : (
                      <div className={styles.pickPlaceholder} />
                    )}
                    <span className={styles.pickTxt}>
                      <strong>{pickFr(m.name, locale)}</strong>
                      <em>{pickFr(m.shortDescription, locale)}</em>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {/* CENTER — preview */}
          <aside className={styles.preview}>
            <div className={styles.card}>
              <div className={styles.cardMedia}>
                {previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewSrc} alt={pickFr(model.name, locale)} />
                ) : null}
                <span className={styles.renderBadge}>{t('configurator.render_badge')}</span>
                {generating && (
                  <div className={styles.renderOverlay}>
                    <span className={styles.renderSpin} />
                    <span>{t('configurator.render_generating')}</span>
                  </div>
                )}
              </div>
              <div className={styles.cardFiche}>
                <div className={styles.cardHeads}>
                  <div className={styles.cardLine}>
                    <span className={styles.eyebrow}>{t('configurator.fiche.coupe')}</span>
                    <strong>{pickFr(model.name, locale)}</strong>
                  </div>
                  <div className={`${styles.cardLine} ${styles.cardLineRight}`}>
                    <span className={styles.eyebrow}>{t('configurator.fiche.motif')}</span>
                    <strong>{fabric ? pickFr(fabric.name, locale) : '—'}</strong>
                  </div>
                </div>
                {model.material && (
                  <p className={styles.cardMatiere}>{pickFr(model.material, locale)}</p>
                )}
                <div className={styles.cardParams}>
                  <span className={styles.chipParam}>
                    {t(`configurator.gender_${gender}` as 'configurator.gender_femme' | 'configurator.gender_homme')}
                  </span>
                  <span className={styles.chipParam}>
                    <span className={styles.dot} style={{ background: teintInfo.hex }} />
                    {teintInfo.name[locale]}
                  </span>
                  <span className={styles.chipParam}>
                    {t('configurator.field_size')} {size}
                  </span>
                  <span className={styles.chipParam}>
                    {height} {t('configurator.height_unit')}
                  </span>
                </div>
                <div className={styles.cardSplit}>
                  <div className={styles.cardLine}>
                    <span className={styles.eyebrow}>{t('configurator.fiche.estimation')}</span>
                    <strong className={styles.cardPrice}>{fmtFCFA(model.basePrice)}</strong>
                  </div>
                  <div className={`${styles.cardLine} ${styles.cardLineRight}`}>
                    <span className={styles.eyebrow}>{t('configurator.fiche.delai')}</span>
                    <strong>{pickFr(model.delayLabel, locale)}</strong>
                  </div>
                </div>
                <p className={styles.cardNote}>{t('configurator.fiche.note')}</p>
              </div>
            </div>
          </aside>

          {/* RIGHT — motif */}
          <fieldset className={styles.col}>
            <legend className={styles.colTitle}>
              <span className={styles.colNum}>03</span> {t('configurator.col_motif')}
            </legend>
            <div className={styles.colList}>
              {model.fabrics.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`${styles.pick} ${styles.pickFabric} ${f.id === fabricId ? styles.pickActive : ''}`}
                  onClick={() => {
                    if (f.id !== fabricId) {
                      setFabricId(f.id);
                      triggerOverlay();
                    }
                  }}
                >
                  {f.swatchImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.swatchImage} alt="" />
                  ) : (
                    <div className={styles.pickPlaceholder} />
                  )}
                  <span className={styles.pickTxt}>
                    <strong>{pickFr(f.name, locale)}</strong>
                    <em>{pickFr(model.material, locale).split(',')[0] ?? ''}</em>
                  </span>
                </button>
              ))}
            </div>
            <p className={styles.colHint}>{t('configurator.fabrics_hint')}</p>
          </fieldset>
        </div>

        <FinalizeForms
          model={model}
          fabric={fabric}
          locale={locale}
          gender={gender}
          teint={teint}
          size={size}
          height={height}
          pane={pane}
          onChangePane={setPane}
          onSuccess={setSuccess}
        />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Finalize — two forms (ORDER, APPOINTMENT) sharing the composition state.
// ─────────────────────────────────────────────────────────────────────────

type FinalizeProps = {
  model: StudioModel;
  fabric: StudioFabric | null;
  locale: Locale;
  gender: Gender;
  teint: number;
  size: (typeof STUDIO_SIZES)[number];
  height: number;
  pane: Pane;
  onChangePane: (p: Pane) => void;
  onSuccess: (s: SuccessState) => void;
};

function FinalizeForms(props: FinalizeProps) {
  const t = useTranslations('studio');
  const { model, fabric, locale, gender, teint, size, height, pane, onChangePane, onSuccess } =
    props;

  const personaPayload = () => ({
    gender: gender.toUpperCase() as 'FEMME' | 'HOMME',
    skinToneIndex: teint,
    silhouetteSize: size,
    silhouetteHeight: height,
  });

  return (
    <div className={styles.finalize}>
      <h2 className={styles.finalizeTitle}>
        <span className={styles.colNum}>04</span> {t('finalize.heading')}
      </h2>
      <div className={styles.toggle} role="tablist">
        <button
          type="button"
          role="tab"
          className={`${styles.toggleBtn} ${pane === 'order' ? styles.toggleActive : ''}`}
          onClick={() => onChangePane('order')}
        >
          {t('finalize.tab_order')}
        </button>
        <button
          type="button"
          role="tab"
          className={`${styles.toggleBtn} ${pane === 'appt' ? styles.toggleActive : ''}`}
          onClick={() => onChangePane('appt')}
        >
          {t('finalize.tab_appt')}
        </button>
      </div>

      <div className={`${styles.pane} ${pane === 'order' ? styles.paneActive : ''}`}>
        <OrderForm
          model={model}
          fabric={fabric}
          locale={locale}
          personaPayload={personaPayload}
          onSuccess={onSuccess}
        />
      </div>
      <div className={`${styles.pane} ${pane === 'appt' ? styles.paneActive : ''}`}>
        <AppointmentForm
          model={model}
          fabric={fabric}
          locale={locale}
          personaPayload={personaPayload}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}

type FormProps = {
  model: StudioModel;
  fabric: StudioFabric | null;
  locale: Locale;
  personaPayload: () => {
    gender: 'FEMME' | 'HOMME';
    skinToneIndex: number;
    silhouetteSize: string;
    silhouetteHeight: number;
  };
  onSuccess: (s: SuccessState) => void;
};

function OrderForm({ model, fabric, locale, personaPayload, onSuccess }: FormProps) {
  const t = useTranslations('studio');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fabric) {
      setError(t('form.error_generic'));
      return;
    }
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    const email = String(data.get('email') ?? '').trim() || undefined;
    const city = String(data.get('city') ?? '').trim() || undefined;
    const sizeRef = String(data.get('sizeRef') ?? '');
    const measurementMode = String(data.get('measurementMode') ?? '') as 'ATELIER' | 'WHATSAPP';
    const notes = String(data.get('notes') ?? '').trim() || undefined;

    try {
      setBusy(true);
      setError(null);
      const res = await fetch('/api/v1/studio/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Source': 'WEB_STORE' },
        body: JSON.stringify({
          type: 'ORDER',
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
          customerCity: city,
          modelId: model.id,
          fabricId: fabric.id,
          sizeRef,
          measurementMode,
          notes,
          ...personaPayload(),
        }),
      });
      if (!res.ok) {
        setError(t('form.error_generic'));
        return;
      }
      onSuccess({
        kind: 'order',
        title: t('success.order_title'),
        body: t('success.order_body', {
          name,
          model: model.name[locale] ?? model.name.fr,
          fabric: fabric.name[locale] ?? fabric.name.fr,
          size: personaPayload().silhouetteSize,
        }),
      });
    } catch {
      setError(t('form.error_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <p className={styles.paneIntro}>{t('form.order.intro')}</p>
      <div className={styles.form}>
        <div className={styles.formField}>
          <label htmlFor="order-name">{t('form.order.name')}</label>
          <input id="order-name" name="name" type="text" placeholder={t('form.order.name_ph')} required />
        </div>
        <div className={styles.formField}>
          <label htmlFor="order-phone">{t('form.order.phone')}</label>
          <input id="order-phone" name="phone" type="tel" placeholder={t('form.order.phone_ph')} required />
        </div>
        <div className={styles.formField}>
          <label htmlFor="order-email">
            {t('form.order.email')} <span className={styles.muted}>{t('form.order.email_optional')}</span>
          </label>
          <input id="order-email" name="email" type="email" placeholder={t('form.order.email_ph')} />
        </div>
        <div className={styles.formField}>
          <label htmlFor="order-city">{t('form.order.city')}</label>
          <input id="order-city" name="city" type="text" placeholder={t('form.order.city_ph')} />
        </div>
        <div className={styles.formField}>
          <label htmlFor="order-size">{t('form.order.size')}</label>
          <div className={styles.selectWrap}>
            <select id="order-size" name="sizeRef" defaultValue={STUDIO_SIZE_REFS[2]} required>
              {STUDIO_SIZE_REFS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.formField}>
          <label htmlFor="order-measure">{t('form.order.measure')}</label>
          <div className={styles.selectWrap}>
            <select id="order-measure" name="measurementMode" defaultValue="ATELIER" required>
              <option value="ATELIER">{t('form.order.measure_atelier')}</option>
              <option value="WHATSAPP">{t('form.order.measure_whatsapp')}</option>
            </select>
          </div>
        </div>
        <div className={`${styles.formField} ${styles.formFieldFull}`}>
          <label htmlFor="order-notes">
            {t('form.order.notes')} <span className={styles.muted}>{t('form.order.notes_optional')}</span>
          </label>
          <textarea id="order-notes" name="notes" placeholder={t('form.order.notes_ph')} />
        </div>
      </div>
      {error && <p className={styles.formError} role="alert">{error}</p>}
      <button type="submit" disabled={busy || !fabric} className={styles.submit}>
        {t('form.order.submit')}
      </button>
    </form>
  );
}

function AppointmentForm({ model, fabric, locale, personaPayload, onSuccess }: FormProps) {
  const t = useTranslations('studio');
  const [mode, setMode] = useState<'ATELIER' | 'VISIO'>('ATELIER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    const date = String(data.get('date') ?? '');
    const slot = String(data.get('slot') ?? '');

    try {
      setBusy(true);
      setError(null);
      const res = await fetch('/api/v1/studio/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Source': 'WEB_STORE' },
        body: JSON.stringify({
          type: 'APPOINTMENT',
          customerName: name,
          customerPhone: phone,
          modelId: model.id,
          fabricId: fabric?.id,
          appointmentMode: mode,
          appointmentDate: date,
          appointmentSlot: slot,
          ...personaPayload(),
        }),
      });
      if (!res.ok) {
        setError(t('form.error_generic'));
        return;
      }
      onSuccess({
        kind: 'appt',
        title: t('success.appt_title'),
        body: t('success.appt_body', {
          mode: mode === 'ATELIER' ? t('form.appt.atelier') : t('form.appt.visio'),
          date,
          slot,
          model: model.name[locale] ?? model.name.fr,
          fabric: fabric ? (fabric.name[locale] ?? fabric.name.fr) : '—',
        }),
      });
    } catch {
      setError(t('form.error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <form onSubmit={submit} noValidate>
      <p className={styles.paneIntro}>{t('form.appt.intro')}</p>
      <p className={styles.cfgLabel}>{t('form.appt.where')}</p>
      <div className={styles.radioGroup}>
        {(
          [
            { v: 'ATELIER', t: t('form.appt.atelier'), s: t('form.appt.atelier_sub'), d: t('form.appt.atelier_dur') },
            { v: 'VISIO', t: t('form.appt.visio'), s: t('form.appt.visio_sub'), d: t('form.appt.visio_dur') },
          ] as const
        ).map((opt) => (
          <label
            key={opt.v}
            className={`${styles.radioOpt} ${mode === opt.v ? styles.radioOptActive : ''}`}
          >
            <input
              type="radio"
              name="apptmode"
              value={opt.v}
              checked={mode === opt.v}
              onChange={() => setMode(opt.v)}
            />
            <span className={styles.radioMark} />
            <div className={styles.radioBody}>
              <strong>{opt.t}</strong>
              <em>{opt.s}</em>
            </div>
            <span className={styles.radioPrice}>{opt.d}</span>
          </label>
        ))}
      </div>

      <p className={styles.cfgLabel}>{t('form.appt.when')}</p>
      <div className={styles.form}>
        <div className={styles.formField}>
          <label htmlFor="appt-date">{t('form.appt.date')}</label>
          <input id="appt-date" name="date" type="date" min={tomorrow} required />
        </div>
        <div className={styles.formField}>
          <label htmlFor="appt-slot">{t('form.appt.slot')}</label>
          <div className={styles.selectWrap}>
            <select id="appt-slot" name="slot" defaultValue={STUDIO_APPT_SLOTS[2]} required>
              {STUDIO_APPT_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.formField}>
          <label htmlFor="appt-name">{t('form.appt.name')}</label>
          <input id="appt-name" name="name" type="text" required />
        </div>
        <div className={styles.formField}>
          <label htmlFor="appt-phone">{t('form.appt.phone')}</label>
          <input id="appt-phone" name="phone" type="tel" required />
        </div>
      </div>
      {error && <p className={styles.formError} role="alert">{error}</p>}
      <button type="submit" disabled={busy} className={styles.submit}>
        {t('form.appt.submit')}
      </button>
    </form>
  );
}
