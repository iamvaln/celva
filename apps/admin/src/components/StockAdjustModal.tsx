import './StockAdjustModal.css';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocaleState, useNotify, useRefresh, useStore } from 'react-admin';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import { fetchJson } from '../http';
import { API_BASE } from '../config';

/**
 * Shared stock-adjustment modal for the Celva back-office.
 *
 * Posts a signed manual stock movement (MANUAL_ADJUSTMENT) to the existing
 * `POST /variants/:id/adjust-stock` endpoint. Self-contained: it renders into a
 * portal wrapped in `.celva-skin` so the brand tokens resolve, and it carries
 * its own FR/EN strings (resolved via the active react-admin locale) so it
 * works without touching i18nUi.ts. The same key set is exported as
 * `ui.stockadj` for the i18n owner to merge later.
 */

type Dir = 'in' | 'out';
type ReasonDir = 'in' | 'out' | 'both';

interface ReasonDef {
  /** Stable id — also the FR/EN label key under `stockadj.reasons`. */
  id: string;
  dir: ReasonDir;
}

/** Manual-adjustment reasons (mirrors the design hand-off modal.jsx). */
const REASONS: ReasonDef[] = [
  { id: 'STARTING_STOCK', dir: 'in' },
  { id: 'DONATION_IN', dir: 'in' },
  { id: 'SCRAP_IN', dir: 'in' },
  { id: 'LOSS_OUT', dir: 'out' },
  { id: 'MANUAL_ADJUSTMENT', dir: 'both' },
];

/** Bilingual strings — also returned to the i18n owner as `ui.stockadj`. */
const STR = {
  fr: {
    title: 'Ajuster le stock',
    subtitle_generic: 'Correction manuelle de stock',
    current_stock: 'stock actuel',
    target_required: 'Choisissez une variante',
    target_label: 'Variante (SKU)',
    target_placeholder: 'Rechercher un SKU ou produit…',
    reason: 'Motif',
    direction: 'Sens',
    dir_in: 'Entrée (+)',
    dir_out: 'Sortie (−)',
    quantity: 'Quantité',
    new_stock: 'Nouveau stock après ajustement',
    cancel: 'Annuler',
    confirm: "Valider l'ajustement",
    close: 'Fermer',
    success: 'Stock ajusté.',
    error: "Échec de l'ajustement du stock.",
    unit: 'pcs',
    reasons: {
      STARTING_STOCK: 'Stock de départ',
      DONATION_IN: 'Don / échantillon',
      SCRAP_IN: 'Chutes récupérées',
      LOSS_OUT: 'Perte / casse',
      MANUAL_ADJUSTMENT: "Correction d'inventaire",
    },
    hints: {
      STARTING_STOCK: 'Inventaire initial',
      DONATION_IN: 'Entrée à coût 0',
      SCRAP_IN: 'Réintégration',
      LOSS_OUT: 'Sortie',
      MANUAL_ADJUSTMENT: 'Écart de comptage',
    },
  },
  en: {
    title: 'Adjust stock',
    subtitle_generic: 'Manual stock correction',
    current_stock: 'current stock',
    target_required: 'Pick a variant',
    target_label: 'Variant (SKU)',
    target_placeholder: 'Search a SKU or product…',
    reason: 'Reason',
    direction: 'Direction',
    dir_in: 'In (+)',
    dir_out: 'Out (−)',
    quantity: 'Quantity',
    new_stock: 'New stock after adjustment',
    cancel: 'Cancel',
    confirm: 'Apply adjustment',
    close: 'Close',
    success: 'Stock adjusted.',
    error: 'Stock adjustment failed.',
    unit: 'pcs',
    reasons: {
      STARTING_STOCK: 'Starting stock',
      DONATION_IN: 'Donation / sample',
      SCRAP_IN: 'Recovered offcuts',
      LOSS_OUT: 'Loss / breakage',
      MANUAL_ADJUSTMENT: 'Inventory correction',
    },
    hints: {
      STARTING_STOCK: 'Initial inventory',
      DONATION_IN: 'Zero-cost entry',
      SCRAP_IN: 'Re-integration',
      LOSS_OUT: 'Outflow',
      MANUAL_ADJUSTMENT: 'Count discrepancy',
    },
  },
} as const;

type Lang = keyof typeof STR;

/** A pickable variant for the generic (no preset variantId) flow. */
export interface VariantPick {
  id: string;
  sku: string;
  stock: number;
  label?: string;
}

export interface StockAdjustModalProps {
  open: boolean;
  onClose: () => void;
  /** Target variant. Omit to show the SKU picker (generic flow). */
  variantId?: string;
  /** Current stock of the target variant (drives the live preview). */
  currentStock?: number;
  /** Display label for the target (product name / SKU). */
  label?: string;
  /** Candidates for the generic picker; required when `variantId` is absent. */
  variants?: VariantPick[];
  /** Fires after a successful adjustment (in addition to the global refresh). */
  onAdjusted?: () => void;
}

export const StockAdjustModal = ({
  open,
  onClose,
  variantId,
  currentStock,
  label,
  variants,
  onAdjusted,
}: StockAdjustModalProps) => {
  const [localeState] = useLocaleState();
  const lang: Lang = localeState === 'en' ? 'en' : 'fr';
  const s = STR[lang];
  const notify = useNotify();
  const refresh = useRefresh();
  const theme = useTheme();
  const [palette] = useStore<'neutral' | 'warm'>('celva.palette', 'neutral');

  const [reasonId, setReasonId] = useState<string>('MANUAL_ADJUSTMENT');
  const [dir, setDir] = useState<Dir>('in');
  const [qty, setQty] = useState<number>(0);
  const [pickedId, setPickedId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Reset transient state whenever the modal (re)opens.
  useEffect(() => {
    if (open) {
      setReasonId('MANUAL_ADJUSTMENT');
      setDir('in');
      setQty(0);
      setPickedId('');
      setSubmitting(false);
    }
  }, [open]);

  // Esc-to-close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const reason = useMemo(
    () => REASONS.find((r) => r.id === reasonId) ?? REASONS[REASONS.length - 1]!,
    [reasonId],
  );
  const effDir: Dir = reason.dir === 'both' ? dir : reason.dir;
  const signed = (effDir === 'in' ? 1 : -1) * Math.abs(qty || 0);

  // Resolve the effective target (preset variantId vs generic picker).
  const usePicker = !variantId;
  const picked = usePicker ? variants?.find((v) => v.id === pickedId) : undefined;
  const targetId = variantId ?? pickedId;
  const baseStock = usePicker ? picked?.stock : currentStock;
  const hasCurrent = typeof baseStock === 'number';
  const next = hasCurrent ? Math.max(0, baseStock! + signed) : null;
  const targetLabel = usePicker ? picked?.label ?? picked?.sku : label;

  const canConfirm = !!targetId && qty > 0 && !submitting;

  if (!open) return null;

  const reasonLabel = s.reasons[reasonId as keyof typeof s.reasons] ?? reasonId;

  const handleConfirm = async () => {
    if (!targetId || qty <= 0) return;
    try {
      setSubmitting(true);
      await fetchJson(`${API_BASE}/variants/${targetId}/adjust-stock`, {
        method: 'POST',
        body: JSON.stringify({ quantity: signed, reason: reasonLabel }),
      });
      notify(s.success, { type: 'success' });
      refresh();
      onAdjusted?.();
      onClose();
    } catch (err) {
      notify(err instanceof Error ? err.message : s.error, { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const subtitle =
    targetLabel != null && targetLabel !== '' ? (
      <>
        {targetLabel}
        {hasCurrent ? ` · ${s.current_stock} ${baseStock} ${s.unit}` : ''}
      </>
    ) : (
      s.subtitle_generic
    );

  const modal = (
    <div
      className="celva-skin stockadj-portal"
      data-theme={theme.palette.mode}
      data-palette={palette}
    >
      <div
        className="stockadj-overlay"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="stockadj-card"
          role="dialog"
          aria-modal="true"
          aria-label={s.title}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="stockadj-head">
            <div className="stockadj-title">{s.title}</div>
            <button
              type="button"
              className="stockadj-close"
              onClick={onClose}
              aria-label={s.close}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
          <div className="stockadj-sub">{subtitle}</div>

          {usePicker && (
            <div className="stockadj-field">
              <label htmlFor="stockadj-variant">{s.target_label}</label>
              <select
                id="stockadj-variant"
                value={pickedId}
                onChange={(e) => setPickedId(e.target.value)}
              >
                <option value="" disabled>
                  {s.target_required}
                </option>
                {(variants ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label ? `${v.label} — ${v.sku}` : v.sku} · {v.stock} {s.unit}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="stockadj-field">
            <label htmlFor="stockadj-reason">{s.reason}</label>
            <select
              id="stockadj-reason"
              value={reasonId}
              onChange={(e) => setReasonId(e.target.value)}
            >
              {REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {s.reasons[r.id as keyof typeof s.reasons]} —{' '}
                  {s.hints[r.id as keyof typeof s.hints]}
                </option>
              ))}
            </select>
          </div>

          {reason.dir === 'both' && (
            <div className="stockadj-field">
              <label>{s.direction}</label>
              <div className="stockadj-seg">
                <button
                  type="button"
                  className={dir === 'in' ? 'on' : ''}
                  onClick={() => setDir('in')}
                >
                  {s.dir_in}
                </button>
                <button
                  type="button"
                  className={dir === 'out' ? 'on' : ''}
                  onClick={() => setDir('out')}
                >
                  {s.dir_out}
                </button>
              </div>
            </div>
          )}

          <div className="stockadj-field">
            <label htmlFor="stockadj-qty">
              {s.quantity} ({s.unit})
            </label>
            <div className="stockadj-num">
              <input
                id="stockadj-qty"
                type="number"
                min={0}
                value={qty}
                autoFocus
                onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))}
              />
              <span className="stockadj-suffix">{s.unit}</span>
            </div>
          </div>

          {hasCurrent && (
            <div className="stockadj-net">
              <span className="stockadj-net-l">{s.new_stock}</span>
              <span
                className={`stockadj-net-v${baseStock! + signed < 0 ? ' neg' : ''}`}
              >
                {next} {s.unit}
              </span>
            </div>
          )}

          <div className="stockadj-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {s.cancel}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              <CheckIcon sx={{ fontSize: 16 }} /> {s.confirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

/** FR/EN strings exposed for the i18n owner to merge under `ui.stockadj`. */
export const stockAdjMessages = STR;
