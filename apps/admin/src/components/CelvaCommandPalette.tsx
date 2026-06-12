import {
  createElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  useLocaleState,
  useRedirect,
  useResourceDefinitions,
  useStore,
  useTranslate,
  type ResourceDefinition,
} from 'react-admin';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import './CelvaCommandPalette.css';

/* Chrome strings live under `ui.cmdk.*`. Those keys are not (yet) registered
   in the message trees, so each lookup passes a locale-aware default via
   polyglot's `_` option — the palette renders bilingually today, and if the
   keys are later added to i18nUi they transparently take precedence. */
const FALLBACKS = {
  fr: {
    placeholder: 'Rechercher un écran…',
    no_results: 'Aucun résultat pour « %{query} »',
    navigation: 'Navigation',
    dashboard: 'Tableau de bord',
    hint_nav: 'naviguer',
    hint_open: 'ouvrir',
    hint_close: 'fermer',
  },
  en: {
    placeholder: 'Search a screen…',
    no_results: 'No results for “%{query}”',
    navigation: 'Navigation',
    dashboard: 'Dashboard',
    hint_nav: 'navigate',
    hint_open: 'open',
    hint_close: 'close',
  },
} as const;

type Entry = {
  /** unique key — resource name, or "__dashboard__" */
  id: string;
  label: string;
  /** react-admin resource name to redirect to, or null for the dashboard */
  resource: string | null;
  icon?: ResourceDefinition['icon'];
};

/** Diacritic-insensitive lowercase for forgiving FR/EN matching. */
const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const PaletteDialog = ({ onClose }: { onClose: () => void }) => {
  const t = useTranslate();
  const [locale] = useLocaleState();
  const redirect = useRedirect();
  const resources = useResourceDefinitions();
  const theme = useTheme();
  const [palette] = useStore<'neutral' | 'warm'>('celva.palette', 'neutral');

  const lang = locale === 'en' ? 'en' : 'fr';
  const fb = FALLBACKS[lang];
  const tx = useCallback(
    (key: keyof typeof fb, options?: Record<string, unknown>) =>
      t(`ui.cmdk.${key}`, { _: fb[key], ...options }),
    [t, fb],
  );

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Full index: dashboard + every list-enabled resource, label via i18n.
  const entries = useMemo<Entry[]>(() => {
    const dashboard: Entry = {
      id: '__dashboard__',
      label: tx('dashboard'),
      resource: null,
      icon: SpaceDashboardOutlinedIcon,
    };
    const resourceEntries = Object.values(resources)
      .filter((def): def is ResourceDefinition => Boolean(def?.hasList))
      .map((def) => ({
        id: def.name,
        label: t(`resources.${def.name}.name`, { smart_count: 2, _: def.name }),
        resource: def.name,
        icon: def.icon,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, lang));
    return [dashboard, ...resourceEntries];
  }, [resources, t, tx, lang]);

  // Substring (diacritic-insensitive, token-wise) filter on the label.
  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return entries;
    const tokens = q.split(/\s+/);
    return entries.filter((e) => {
      const hay = normalize(e.label);
      return tokens.every((tok) => hay.includes(tok));
    });
  }, [entries, query]);

  // Keep selection in range whenever the result set changes.
  useEffect(() => {
    setSelected((s) => (results.length === 0 ? 0 : Math.min(s, results.length - 1)));
  }, [results]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const activate = useCallback(
    (entry: Entry | undefined) => {
      if (!entry) return;
      onClose();
      if (entry.resource === null) redirect('/');
      else redirect('list', entry.resource);
    },
    [onClose, redirect],
  );

  // Scroll the active row into view as the selection moves.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>('.celva-cmdk-item.is-selected');
    if (!el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top - 8;
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight + 8;
  }, [selected, results]);

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(results.length - 1, s + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(0, s - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(results[selected]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSelected(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSelected(Math.max(0, results.length - 1));
    }
  };

  return createPortal(
    <div
      className="celva-cmdk"
      data-theme={theme.palette.mode}
      data-palette={palette}
    >
      <div
        className="celva-cmdk-overlay"
        onMouseDown={(e) => {
          // close only when the click starts on the backdrop itself
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="celva-cmdk-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <span id={titleId} hidden>
            {tx('placeholder')}
          </span>

          <div className="celva-cmdk-head">
            <span className="celva-cmdk-ic" aria-hidden>
              <SearchIcon fontSize="small" />
            </span>
            <input
              ref={inputRef}
              className="celva-cmdk-input"
              type="text"
              placeholder={tx('placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              aria-label={tx('placeholder')}
              aria-controls={`${titleId}-list`}
              autoComplete="off"
              spellCheck={false}
            />
            <span className="celva-cmdk-kbd-esc">Esc</span>
          </div>

          <div className="celva-cmdk-list" id={`${titleId}-list`} role="listbox" ref={listRef}>
            {results.length === 0 ? (
              <div className="celva-cmdk-empty">
                {tx('no_results', { query: query.trim() })}
              </div>
            ) : (
              <>
                <div className="celva-cmdk-group-label">{tx('navigation')}</div>
                {results.map((entry, idx) => (
                  <button
                    key={entry.id}
                    type="button"
                    role="option"
                    aria-selected={idx === selected}
                    className={
                      'celva-cmdk-item' + (idx === selected ? ' is-selected' : '')
                    }
                    onMouseMove={() => setSelected(idx)}
                    onClick={() => activate(entry)}
                  >
                    <span className="celva-cmdk-item-ic" aria-hidden>
                      {entry.icon
                        ? createElement(entry.icon)
                        : createElement(SpaceDashboardOutlinedIcon)}
                    </span>
                    <span className="celva-cmdk-item-main">
                      <span className="celva-cmdk-item-title">{entry.label}</span>
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="celva-cmdk-foot">
            <span className="celva-cmdk-kb">
              <span className="celva-cmdk-key">↑</span>
              <span className="celva-cmdk-key">↓</span>
              {tx('hint_nav')}
            </span>
            <span className="celva-cmdk-kb">
              <span className="celva-cmdk-key">↵</span>
              {tx('hint_open')}
            </span>
            <span className="celva-cmdk-kb">
              <span className="celva-cmdk-key">esc</span>
              {tx('hint_close')}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/**
 * ⌘K / Ctrl+K command palette for fuzzy navigation across the back-office.
 * Mounted once inside CelvaLayout. Owns its own open state + the global
 * keydown listener; the dialog itself only renders while open.
 */
export const CelvaCommandPalette = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Open on ⌘K (Mac) / Ctrl+K — anywhere, even from inputs.
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      // Bare key shortcuts are ignored while typing in a field — the
      // palette currently has none, but this keeps the guard honest.
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!open) return null;
  return <PaletteDialog onClose={() => setOpen(false)} />;
};
