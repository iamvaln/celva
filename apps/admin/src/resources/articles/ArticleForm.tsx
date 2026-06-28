import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Form,
  useCreate,
  useNotify,
  useRecordContext,
  useRedirect,
  useTranslate,
  useUpdate,
} from 'react-admin';
import { useWatch } from 'react-hook-form';
import type { Article } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE, STOREFRONT_URL } from '../../config';
import { ImageDropInput } from '../../components/ImageDropInput';
import './articles.css';

const ARTICLE_CATEGORIES = ['STYLE', 'BEHIND_THE_SCENES', 'EVENTS', 'GUIDES'] as const;
type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

/** Per-category tone (drives the `--cc` pill colour), mirrors the storefront hues. */
const CATEGORY_TONE: Record<ArticleCategory, string> = {
  STYLE: 'var(--st-prod)',
  BEHIND_THE_SCENES: 'var(--st-info)',
  EVENTS: 'var(--st-urgent)',
  GUIDES: 'var(--st-done)',
};

type Lang = 'fr' | 'en';

function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripHtml(html: string): string {
  return (html || '').replace(/<[^>]*>/g, '').trim();
}

// ── Inline icons (no external icon dep — match the design's stroke glyphs) ──
const Ico = {
  search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35',
  check: 'M20 6 9 17l-5-5',
  close: 'M18 6 6 18M6 6l12 12',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
} as const;

const Stroke = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

// ── Inline AI translate button (FR → EN) ────────────────────────────
// The article fields are local state (not react-hook-form registered), so the
// shared <AiAssistButton> doesn't apply here — this thin wrapper calls the same
// /ai/translate endpoint and hands the result back through `onResult`.
const AiTranslateButton = ({
  text,
  kind,
  onResult,
}: {
  text: string;
  kind: 'name' | 'description' | 'text';
  onResult: (translated: string) => void;
}) => {
  const translate = useTranslate();
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const disabled = loading || text.trim().length === 0;

  const run = async () => {
    if (disabled) return;
    setLoading(true);
    try {
      const { body } = await fetchJson<{ text: string }>(`${API_BASE}/ai/translate`, {
        method: 'POST',
        body: JSON.stringify({
          text,
          sourceLocale: 'fr',
          targetLocale: 'en',
          kind,
        }),
      });
      onResult(body.text);
      notify('ui.ai.translated', { type: 'success' });
    } catch (err) {
      notify(err instanceof Error ? err.message : translate('ui.ai.error'), { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className="btn btn-ghost" onClick={run} disabled={disabled}>
      {translate(loading ? 'ui.ai.translating' : 'ui.ai.translate_to_en')}
    </button>
  );
};

// ── Rich text editor ────────────────────────────────────────────────
type RichEditorProps = {
  lang: Lang;
  valueFr: string;
  valueEn: string;
  onChange: (lang: Lang, html: string) => void;
};

const RichEditor = ({ lang, valueFr, valueEn, onChange }: RichEditorProps) => {
  const translate = useTranslate();
  const ref = useRef<HTMLDivElement | null>(null);
  const value = lang === 'fr' ? valueFr : valueEn;

  // Set innerHTML only when the active language changes (or on mount), never on
  // every keystroke — preserves the caret while typing.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const sync = () => {
    if (ref.current) onChange(lang, ref.current.innerHTML);
  };
  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
    sync();
  };
  const block = (tag: string) => exec('formatBlock', tag);
  const link = () => {
    const url = window.prompt(translate('ui.articles_edit.link_prompt'));
    if (url) exec('createLink', url);
  };

  type Btn =
    | { sep: true }
    | {
        label?: string;
        icon?: keyof typeof Ico;
        title: string;
        style?: CSSProperties;
        run: () => void;
      };

  const toolbar: Btn[] = [
    { label: 'B', title: translate('ui.articles_edit.toolbar_bold'), style: { fontWeight: 700 }, run: () => exec('bold') },
    {
      label: 'I',
      title: translate('ui.articles_edit.toolbar_italic'),
      style: { fontStyle: 'italic', fontFamily: 'var(--font-display)' },
      run: () => exec('italic'),
    },
    { sep: true },
    { label: translate('ui.articles_edit.toolbar_heading_label'), title: translate('ui.articles_edit.toolbar_heading'), run: () => block('<h2>') },
    { label: translate('ui.articles_edit.toolbar_paragraph_label'), title: translate('ui.articles_edit.toolbar_paragraph'), run: () => block('<p>') },
    { sep: true },
    { icon: 'list', title: translate('ui.articles_edit.toolbar_list'), run: () => exec('insertUnorderedList') },
    {
      label: '“',
      title: translate('ui.articles_edit.toolbar_quote'),
      style: { fontFamily: 'var(--font-display)', fontSize: 20, lineHeight: 1 },
      run: () => block('<blockquote>'),
    },
    { icon: 'link', title: translate('ui.articles_edit.toolbar_link'), run: link },
  ];

  return (
    <div className="rt-editor">
      <div className="rt-toolbar" role="toolbar" aria-label={translate('ui.articles_edit.content_section')}>
        {toolbar.map((b, i) =>
          'sep' in b ? (
            <span key={i} className="rt-sep" aria-hidden="true" />
          ) : (
            <button
              key={i}
              type="button"
              className="rt-btn"
              title={b.title}
              aria-label={b.title}
              style={b.style}
              onMouseDown={(e) => {
                e.preventDefault();
                b.run();
              }}
            >
              {b.icon ? <Stroke d={Ico[b.icon]} size={15} /> : b.label}
            </button>
          ),
        )}
      </div>
      <div
        key={lang}
        ref={ref}
        className="rt-area"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={translate('ui.articles_edit.content_section')}
        onInput={sync}
        dangerouslySetInnerHTML={{ __html: value || '' }}
      />
    </div>
  );
};

const CategoryPill = ({ category, label }: { category: ArticleCategory; label: string }) => (
  <span className="cat-pill" style={{ '--cc': CATEGORY_TONE[category] } as CSSProperties}>
    {label}
  </span>
);

// ── Shared bespoke form ─────────────────────────────────────────────
const InnerForm = ({ mode }: { mode: 'edit' | 'create' }) => {
  const record = useRecordContext<Article>();
  const translate = useTranslate();
  const notify = useNotify();
  const redirect = useRedirect();
  const [update, { isLoading: updating }] = useUpdate();
  const [create, { isLoading: creating }] = useCreate();

  const isNew = mode === 'create';

  // coverImage is owned by the RA <Form> (ImageDropInput binds to it via useInput).
  const coverImage = (useWatch({ name: 'coverImage' }) as string | undefined) ?? '';

  // Everything else is local state, seeded from the record once.
  const [titleFr, setTitleFr] = useState(record?.title?.fr ?? '');
  const [titleEn, setTitleEn] = useState(record?.title?.en ?? '');
  const [excerptFr, setExcerptFr] = useState(record?.excerpt?.fr ?? '');
  const [excerptEn, setExcerptEn] = useState(record?.excerpt?.en ?? '');
  const [contentFr, setContentFr] = useState(record?.content?.fr ?? '');
  const [contentEn, setContentEn] = useState(record?.content?.en ?? '');
  const [slug, setSlug] = useState(record?.slug ?? '');
  const [category, setCategory] = useState<ArticleCategory>(
    (record?.category as ArticleCategory) ?? 'STYLE',
  );
  const [lang, setLang] = useState<Lang>('fr');
  const [slugTouched, setSlugTouched] = useState(!isNew && !!record?.slug);

  // Auto-derive the slug from the FR title until the user edits it by hand.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(titleFr));
  }, [titleFr, slugTouched]);

  const baseTitle = record?.title?.fr ?? '';
  const displayTitle =
    titleFr.trim() || (isNew ? translate('ui.articles_edit.untitled') : baseTitle) || translate('ui.articles_edit.untitled');

  const isPublished = !!record?.isPublished;
  const authorName = record?.author?.name ?? '';

  const hasTitle = !!titleFr.trim();
  const hasContent = !!stripHtml(contentFr);
  const hasCategory = !!category;
  const canPublish = hasTitle && hasContent && hasCategory;
  const busy = updating || creating;

  const categoryLabel = (c: ArticleCategory) => translate(`ui.articles_edit.cat_${c.toLowerCase()}`);

  const buildData = () => ({
    title: { fr: titleFr, en: titleEn },
    excerpt: { fr: excerptFr, en: excerptEn },
    content: { fr: contentFr, en: contentEn },
    slug,
    coverImage: coverImage || null,
    category,
  });

  const validate = (): boolean => {
    if (!titleFr.trim()) {
      notify('ui.articles_edit.err_title_required', { type: 'warning' });
      return false;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      notify('ui.articles_edit.err_slug_invalid', { type: 'warning' });
      return false;
    }
    return true;
  };

  // Persist title/excerpt/content/slug/cover/category — never isPublished.
  const save = async (): Promise<string | null> => {
    if (!validate()) return null;
    const data = buildData();
    if (isNew) {
      const newId = await new Promise<string | null>((resolve) => {
        create(
          'articles',
          { data },
          {
            onSuccess: (rec) => resolve(rec?.id != null ? String(rec.id) : null),
            onError: (err) => {
              notify(err instanceof Error ? err.message : 'ra.notification.http_error', {
                type: 'error',
              });
              resolve(null);
            },
          },
        );
      });
      return newId;
    }
    if (!record?.id) return null;
    const ok = await new Promise<boolean>((resolve) => {
      update(
        'articles',
        { id: record.id, data, previousData: record },
        {
          onSuccess: () => resolve(true),
          onError: (err) => {
            notify(err instanceof Error ? err.message : 'ra.notification.http_error', {
              type: 'error',
            });
            resolve(false);
          },
        },
      );
    });
    return ok ? String(record.id) : null;
  };

  const onSave = async () => {
    const id = await save();
    if (id == null) return;
    notify('ui.articles_edit.saved', { type: 'success' });
    redirect('list', 'articles');
  };

  const onPublish = async () => {
    const id = await save();
    if (id == null) return;
    try {
      await fetchJson(`${API_BASE}/articles/admin/${id}/publish`, { method: 'POST' });
      notify(isPublished ? 'ui.articles_edit.updated' : 'ui.articles_edit.published', {
        type: 'success',
      });
      redirect('list', 'articles');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'ra.notification.http_error', { type: 'error' });
    }
  };

  const onPreview = () => {
    if (isPublished && slug) {
      window.open(`${STOREFRONT_URL}/journal/${slug}`, '_blank', 'noopener,noreferrer');
    } else {
      notify('ui.articles_edit.preview_unavailable', { type: 'info' });
    }
  };

  return (
    <div className="fade-in art-edit">
      {/* ── Header ── */}
      <div className="edit-head">
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">
            {translate(isNew ? 'ui.articles_edit.header_new' : 'ui.articles_edit.header_edit')}
          </div>
          <div className="row" style={{ gap: 14, marginTop: 6 }}>
            <h1 className="prod-title">{displayTitle}</h1>
            <span className={`pill ${isPublished ? 's-done' : 's-neutral'}`}>
              <span className="pdot" />
              {translate(
                isPublished ? 'ui.articles_edit.status_published' : 'ui.articles_edit.status_draft',
              )}
            </span>
          </div>
        </div>
        <div className="dh-actions">
          <button type="button" className="btn btn-ghost" onClick={onPreview} disabled={busy}>
            <Stroke d={Ico.search} size={15} />
            {translate('ui.articles_edit.preview')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSave} disabled={busy}>
            {translate('ui.articles_edit.save')}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={busy || !canPublish}
            onClick={onPublish}
          >
            <Stroke d={Ico.check} size={16} />
            {translate(isPublished ? 'ui.articles_edit.update' : 'ui.articles_edit.publish')}
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="edit-grid">
        {/* LEFT column */}
        <div className="grid">
          {/* Cover */}
          <div className="info-card">
            <h4>{translate('ui.articles_edit.cover_title')}</h4>
            <div className="note" style={{ marginTop: -6, marginBottom: 14 }}>
              {translate('ui.articles_edit.cover_note')}
            </div>
            <ImageDropInput source="coverImage" aspectRatio={16 / 9} />
          </div>

          {/* Title & accroche */}
          <div className="info-card">
            <h4>{translate('ui.articles_edit.title_section')}</h4>
            <div className="field-row">
              <div className="field half">
                <label htmlFor="art-title-fr">{translate('ui.articles_edit.title_fr')}</label>
                <input
                  id="art-title-fr"
                  type="text"
                  value={titleFr}
                  onChange={(e) => setTitleFr(e.target.value)}
                />
              </div>
              <div className="field half">
                <label htmlFor="art-title-en">
                  {translate('ui.articles_edit.title_en')}
                  <span className="fhint">{translate('ui.articles_edit.optional')}</span>
                </label>
                <input
                  id="art-title-en"
                  type="text"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                />
                <div style={{ marginTop: 8 }}>
                  <AiTranslateButton text={titleFr} kind="name" onResult={setTitleEn} />
                </div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="art-slug">{translate('ui.articles_edit.slug')}</label>
              <div className="slug-field">
                <span className="slug-pre">celva.store/journal/</span>
                <input
                  id="art-slug"
                  type="text"
                  className="mono-input"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field half">
                <label htmlFor="art-excerpt-fr">
                  {translate('ui.articles_edit.excerpt_fr')}
                  <span className="fhint">{translate('ui.articles_edit.excerpt_hint')}</span>
                </label>
                <textarea
                  id="art-excerpt-fr"
                  rows={2}
                  value={excerptFr}
                  onChange={(e) => setExcerptFr(e.target.value)}
                />
              </div>
              <div className="field half">
                <label htmlFor="art-excerpt-en">
                  {translate('ui.articles_edit.excerpt_en')}
                  <span className="fhint">{translate('ui.articles_edit.optional')}</span>
                </label>
                <textarea
                  id="art-excerpt-en"
                  rows={2}
                  value={excerptEn}
                  onChange={(e) => setExcerptEn(e.target.value)}
                />
                <div style={{ marginTop: 8 }}>
                  <AiTranslateButton text={excerptFr} kind="text" onResult={setExcerptEn} />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="info-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="between" style={{ padding: '18px 22px 0' }}>
              <h4 style={{ margin: 0 }}>{translate('ui.articles_edit.content_section')}</h4>
              <div className="lang-tabs">
                <button
                  type="button"
                  className={lang === 'fr' ? 'on' : ''}
                  onClick={() => setLang('fr')}
                >
                  {translate('ui.articles_edit.lang_fr')}
                </button>
                <button
                  type="button"
                  className={lang === 'en' ? 'on' : ''}
                  onClick={() => setLang('en')}
                >
                  {translate('ui.articles_edit.lang_en')}
                </button>
              </div>
            </div>
            <div
              className="note"
              style={{
                padding: '6px 22px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span>{translate('ui.articles_edit.content_note')}</span>
              <AiTranslateButton text={contentFr} kind="description" onResult={setContentEn} />
            </div>
            <RichEditor
              lang={lang}
              valueFr={contentFr}
              valueEn={contentEn}
              onChange={(l, html) => (l === 'fr' ? setContentFr(html) : setContentEn(html))}
            />
          </div>
        </div>

        {/* RIGHT rail */}
        <div className="grid">
          {/* Category */}
          <div className="info-card">
            <h4>{translate('ui.articles_edit.category')}</h4>
            <select
              className="art-cat-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as ArticleCategory)}
              aria-label={translate('ui.articles_edit.category')}
            >
              {ARTICLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
            <div style={{ marginTop: 14 }}>
              <CategoryPill category={category} label={categoryLabel(category)} />
            </div>
          </div>

          {/* Publish checklist */}
          <div className="vis-card">
            <h4 className="vis-card-head">{translate('ui.articles_edit.checklist_title')}</h4>
            {(
              [
                [translate('ui.articles_edit.check_title'), hasTitle],
                [translate('ui.articles_edit.check_content'), hasContent],
                [translate('ui.articles_edit.check_category'), hasCategory],
              ] as Array<[string, boolean]>
            ).map(([label, ok], i) => (
              <div className="vc-line" key={i}>
                <span className={`vc-ic ${ok ? 'ok' : 'no'}`}>
                  <Stroke d={ok ? Ico.check : Ico.close} size={16} />
                </span>
                {label}
              </div>
            ))}
            <div className={`vis-verdict ${canPublish ? 'live' : 'hidden'}`}>
              {translate(
                canPublish
                  ? 'ui.articles_edit.verdict_ready'
                  : 'ui.articles_edit.verdict_missing',
              )}
            </div>
          </div>

          {/* Recap */}
          <div className="info-card">
            <h4>{translate('ui.articles_edit.recap')}</h4>
            <div className="kv-line">
              <span className="k">{translate('ui.articles_edit.recap_status')}</span>
              <span className="v">
                {translate(
                  isPublished
                    ? 'ui.articles_edit.status_published'
                    : 'ui.articles_edit.status_draft',
                )}
              </span>
            </div>
            {authorName ? (
              <div className="kv-line">
                <span className="k">{translate('ui.articles_edit.recap_author')}</span>
                <span className="v">{authorName}</span>
              </div>
            ) : null}
            {isPublished && record?.publishedAt ? (
              <div className="kv-line">
                <span className="k">{translate('ui.articles_edit.recap_published_at')}</span>
                <span className="v">
                  {new Date(record.publishedAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Bespoke bilingual article editor. Wrapped in RA `<Form>` so the cover
 * `ImageDropInput` resolves its `useInput` binding; all other fields are
 * local state flushed through `useUpdate` / `useCreate` on save.
 */
export const ArticleForm = ({ mode }: { mode: 'edit' | 'create' }) => (
  <Form
    defaultValues={mode === 'create' ? { coverImage: '' } : undefined}
    // We drive submission from explicit buttons; this no-ops the implicit submit.
    onSubmit={() => undefined}
  >
    <InnerForm mode={mode} />
  </Form>
);
