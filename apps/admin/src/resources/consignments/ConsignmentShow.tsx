import { useState } from 'react';
import {
  Show,
  useLocaleState,
  useNotify,
  useRecordContext,
  useRedirect,
  useRefresh,
  useTranslate,
} from 'react-admin';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField as MuiTextField,
  Button as MuiButton,
  Typography,
} from '@mui/material';
import type { Consignment } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';
import { CelvaSkin } from '../../components/CelvaSkin';
import { fmtFCFA } from '../orders/orderSkin';

// ── Local bilingual strings (ui.cons_show.*) ─────────────────────────────
// Kept local (not in the shared i18nUi.ts) so this module stays self-contained
// while remaining fully bilingual. Picked by the active react-admin locale.
type Dict = Record<string, string>;

const CONS_SHOW_FR: Dict = {
  back: 'Consignations',
  status_active: 'Active',
  status_reconciled: 'Réconciliée',
  status_cancelled: 'Annulée',
  ref: 'référence',
  refs: 'références',
  pieces_taken: 'pièces confiées',
  action_reconcile: 'Réconcilier',
  action_cancel: 'Annuler la consignation',
  card_items: 'Pièces confiées',
  card_rep: 'Commercial',
  card_status: 'Statut & dates',
  card_summary: 'Récapitulatif',
  card_notes: 'Notes',
  col_taken: 'Confiées',
  col_sold: 'Vendues',
  col_returned: 'Rapportées',
  kv_status: 'Statut',
  kv_released: 'Confiée le',
  kv_reconciled: 'Réconciliée le',
  kv_created_by: 'Créée par',
  sum_pieces_out: 'Pièces dehors',
  sum_pieces_sold: 'Vendues',
  sum_pieces_returned: 'Rapportées',
  sum_value: 'Valeur consignée',
  empty: '—',
  dlg_title: 'Réconcilier la consignation',
  dlg_hint:
    'Saisissez les quantités vendues et rapportées par référence. L’écart (confiées − vendues − rapportées) est tracé comme perte.',
  dlg_sold: 'Vendues',
  dlg_returned: 'Rapportées',
  dlg_variance: 'Écart',
  dlg_notes: 'Notes',
  dlg_taken: 'confiées',
  cancel_confirm: 'Annuler cette consignation et remettre tout le stock ? Action irréversible.',
  act_cancel: 'Annuler',
  act_confirm: 'Confirmer',
  notify_reconciled: 'Consignation réconciliée.',
  notify_cancelled: 'Consignation annulée.',
};

const CONS_SHOW_EN: Dict = {
  back: 'Consignments',
  status_active: 'Active',
  status_reconciled: 'Reconciled',
  status_cancelled: 'Cancelled',
  ref: 'reference',
  refs: 'references',
  pieces_taken: 'pieces released',
  action_reconcile: 'Reconcile',
  action_cancel: 'Cancel consignment',
  card_items: 'Released pieces',
  card_rep: 'Sales rep',
  card_status: 'Status & dates',
  card_summary: 'Summary',
  card_notes: 'Notes',
  col_taken: 'Released',
  col_sold: 'Sold',
  col_returned: 'Returned',
  kv_status: 'Status',
  kv_released: 'Released on',
  kv_reconciled: 'Reconciled on',
  kv_created_by: 'Created by',
  sum_pieces_out: 'Pieces out',
  sum_pieces_sold: 'Sold',
  sum_pieces_returned: 'Returned',
  sum_value: 'Consigned value',
  empty: '—',
  dlg_title: 'Reconcile consignment',
  dlg_hint:
    'Enter quantities sold and returned per reference. The variance (released − sold − returned) is tracked as loss.',
  dlg_sold: 'Sold',
  dlg_returned: 'Returned',
  dlg_variance: 'Variance',
  dlg_notes: 'Notes',
  dlg_taken: 'released',
  cancel_confirm: 'Cancel this consignment and return all stock? This cannot be undone.',
  act_cancel: 'Cancel',
  act_confirm: 'Confirm',
  notify_reconciled: 'Consignment reconciled.',
  notify_cancelled: 'Consignment cancelled.',
};

/** Hook returning a scoped translate fn for ui.cons_show.* keys. */
const useConsT = () => {
  const [locale] = useLocaleState();
  const dict = locale === 'en' ? CONS_SHOW_EN : CONS_SHOW_FR;
  return (key: string) => dict[key] ?? key;
};

const STATUS_SKIN: Record<Consignment['status'], { sc: string; key: string }> = {
  ACTIVE: { sc: 's-todo', key: 'status_active' },
  RECONCILED: { sc: 's-done', key: 'status_reconciled' },
  CANCELLED: { sc: 's-neutral', key: 'status_cancelled' },
};

const ConsStatusPill = ({ status }: { status: Consignment['status'] }) => {
  const ct = useConsT();
  const s = STATUS_SKIN[status];
  return (
    <span className={`pill ${s.sc}`}>
      <span className="pdot" />
      {ct(s.key)}
    </span>
  );
};

// Unit value per consigned piece: variant override else product display price.
const unitValue = (item: Consignment['items'][number]): number =>
  Number(item.variant.priceOverride ?? item.variant.product.displayPrice ?? 0);

const consignValue = (record: Consignment): number =>
  record.items.reduce((s, it) => s + it.quantityTaken * unitValue(it), 0);

const fmtDate = (iso: string, locale: string): string =>
  new Date(iso).toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const KV = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="kv-line">
    <span className="k">{k}</span>
    <span className="v">{v}</span>
  </div>
);

// ── Reconcile dialog (functional flow preserved verbatim) ────────────────
// Same endpoint (POST /consignments/:id/reconcile) and payload
// ({ items: [{ id, quantitySold, quantityReturned }], notes }) as before.
const ReconcileDialog = ({
  open,
  onClose,
  record,
}: {
  open: boolean;
  onClose: () => void;
  record: Consignment;
}) => {
  const t = useTranslate();
  const ct = useConsT();
  const notify = useNotify();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  // Map item id → { sold, returned } strings (we use strings to let the
  // input be empty/typed; convert on submit).
  const [rows, setRows] = useState<Record<string, { sold: string; returned: string }>>(() => {
    const initial: Record<string, { sold: string; returned: string }> = {};
    for (const item of record.items) {
      initial[item.id] = { sold: '0', returned: String(item.quantityTaken) };
    }
    return initial;
  });
  const [notes, setNotes] = useState(record.notes ?? '');

  const submit = async () => {
    try {
      setBusy(true);
      const items = record.items.map((item) => {
        const r = rows[item.id] ?? { sold: '0', returned: '0' };
        return {
          id: item.id,
          quantitySold: Number(r.sold) || 0,
          quantityReturned: Number(r.returned) || 0,
        };
      });
      await fetchJson(`${API_BASE}/consignments/${record.id}/reconcile`, {
        method: 'POST',
        body: JSON.stringify({ items, notes: notes.trim() || undefined }),
      });
      notify('resources.consignments.notifications.reconciled', { type: 'success' });
      onClose();
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), {
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{ct('dlg_title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {ct('dlg_hint')}
          </Typography>
          {record.items.map((item) => {
            const taken = item.quantityTaken;
            const sold = Number(rows[item.id]?.sold ?? 0);
            const returned = Number(rows[item.id]?.returned ?? 0);
            const variance = taken - sold - returned;
            const overflow = variance < 0;
            return (
              <Box
                key={item.id}
                sx={{
                  border: '1px solid',
                  borderColor: overflow ? 'error.main' : 'divider',
                  p: 1.5,
                }}
              >
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  {item.variant.product.name?.fr ?? item.variant.sku} — {item.variant.sku} ·{' '}
                  {ct('dlg_taken')} {taken}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <MuiTextField
                    label={ct('dlg_sold')}
                    type="number"
                    size="small"
                    value={rows[item.id]?.sold ?? '0'}
                    onChange={(e) =>
                      setRows({
                        ...rows,
                        [item.id]: { ...rows[item.id]!, sold: e.target.value },
                      })
                    }
                    inputProps={{ min: 0, max: taken }}
                  />
                  <MuiTextField
                    label={ct('dlg_returned')}
                    type="number"
                    size="small"
                    value={rows[item.id]?.returned ?? '0'}
                    onChange={(e) =>
                      setRows({
                        ...rows,
                        [item.id]: { ...rows[item.id]!, returned: e.target.value },
                      })
                    }
                    inputProps={{ min: 0, max: taken }}
                  />
                  <MuiTextField
                    label={ct('dlg_variance')}
                    value={variance}
                    size="small"
                    InputProps={{ readOnly: true }}
                    error={overflow}
                  />
                </Stack>
              </Box>
            );
          })}
          <MuiTextField
            label={ct('dlg_notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            inputProps={{ maxLength: 500 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <MuiButton onClick={onClose}>{ct('act_cancel')}</MuiButton>
        <MuiButton variant="contained" disabled={busy} onClick={submit}>
          {ct('act_confirm')}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
};

// ── Cancel action (preserved: POST /consignments/:id/cancel) ─────────────
const CancelConsignmentButton = () => {
  const record = useRecordContext<Consignment>();
  const t = useTranslate();
  const ct = useConsT();
  const notify = useNotify();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);

  if (!record || record.status !== 'ACTIVE') return null;

  const handle = async () => {
    if (!window.confirm(ct('cancel_confirm'))) return;
    try {
      setBusy(true);
      await fetchJson(`${API_BASE}/consignments/${record.id}/cancel`, { method: 'POST' });
      notify('resources.consignments.notifications.cancelled', { type: 'success' });
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), {
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className="btn btn-quiet btn-danger" disabled={busy} onClick={handle}>
      {ct('action_cancel')}
    </button>
  );
};

// ── Detail layout (design) ───────────────────────────────────────────────
const ConsignmentDetailSkin = () => {
  const record = useRecordContext<Consignment>();
  const redirect = useRedirect();
  const ct = useConsT();
  const [locale] = useLocaleState();
  const [open, setOpen] = useState(false);
  if (!record) return null;

  const isActive = record.status === 'ACTIVE';
  const refCount = record.items.length;
  const piecesOut = record.items.reduce((s, it) => s + it.quantityTaken, 0);
  const piecesSold = record.items.reduce((s, it) => s + it.quantitySold, 0);
  const piecesReturned = record.items.reduce((s, it) => s + it.quantityReturned, 0);
  const value = consignValue(record);
  const ref = `CSG-${record.id.slice(0, 6).toUpperCase()}`;

  return (
    <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
      <button
        className="back-link"
        style={{ marginBottom: 16 }}
        onClick={() => redirect('list', 'consignments')}
      >
        <ArrowBackIcon sx={{ fontSize: 16 }} /> {ct('back')}
      </button>

      {/* Header */}
      <div className="detail-head">
        <div>
          <div className="row" style={{ gap: 14 }}>
            <span className="dh-num">{ref}</span>
            <ConsStatusPill status={record.status} />
          </div>
          <div className="dh-meta">
            <span className="row" style={{ gap: 6 }}>
              <BusinessCenterIcon sx={{ fontSize: 14 }} />
              {record.salesRep.name}
            </span>
            <span>·</span>
            <span>
              {refCount} {refCount > 1 ? ct('refs') : ct('ref')}
            </span>
            <span>·</span>
            <span>
              {piecesOut} {ct('pieces_taken')}
            </span>
          </div>
        </div>
        {isActive && (
          <div className="dh-actions">
            <button className="btn btn-primary btn-lg" onClick={() => setOpen(true)}>
              {ct('action_reconcile')}
            </button>
          </div>
        )}
      </div>

      {/* Secondary actions */}
      <div className="secondary-actions">
        <CancelConsignmentButton />
      </div>

      <div className="detail-grid">
        {/* Left column — items */}
        <div className="grid">
          <div className="info-card">
            <h4>{ct('card_items')}</h4>
            <div className="cons-cols">
              <span />
              <span>{ct('col_taken')}</span>
              <span>{ct('col_sold')}</span>
              <span>{ct('col_returned')}</span>
            </div>
            {record.items.map((it) => (
              <div className="item-line cons-line" key={it.id}>
                <div className="ithumb">
                  <Inventory2Icon sx={{ fontSize: 20 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="iname">{it.variant.product?.name?.fr ?? it.variant.sku}</div>
                  <div className="ivar">{it.variant.sku}</div>
                </div>
                <div className="cons-q num">{it.quantityTaken}</div>
                <div className="cons-q num">{it.quantitySold}</div>
                <div className="cons-q num">{it.quantityReturned}</div>
              </div>
            ))}
          </div>

          {record.notes && (
            <div className="info-card">
              <h4>{ct('card_notes')}</h4>
              <div style={{ fontSize: 15 }}>{record.notes}</div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="grid">
          <div className="info-card">
            <h4>{ct('card_rep')}</h4>
            <div className="cons-rep">
              <div className="cons-rep-av">{initials(record.salesRep.name)}</div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 500,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {record.salesRep.name}
                </div>
                <div className="client-context">{record.salesRep.email}</div>
              </div>
            </div>
          </div>

          <div className="info-card">
            <h4>{ct('card_status')}</h4>
            <KV k={ct('kv_status')} v={<ConsStatusPill status={record.status} />} />
            <KV k={ct('kv_released')} v={fmtDate(record.releasedAt, locale)} />
            <KV
              k={ct('kv_reconciled')}
              v={record.reconciledAt ? fmtDate(record.reconciledAt, locale) : ct('empty')}
            />
            {record.createdBy && <KV k={ct('kv_created_by')} v={record.createdBy.name} />}
          </div>

          <div className="info-card">
            <h4>{ct('card_summary')}</h4>
            <div className="fin-line">
              <span className="muted">{ct('sum_pieces_out')}</span>
              <span className="num">{piecesOut}</span>
            </div>
            <div className="fin-line">
              <span className="muted">{ct('sum_pieces_sold')}</span>
              <span className="num">{piecesSold}</span>
            </div>
            <div className="fin-line">
              <span className="muted">{ct('sum_pieces_returned')}</span>
              <span className="num">{piecesReturned}</span>
            </div>
            <div className="fin-line total">
              <span>{ct('sum_value')}</span>
              <span className="v num">{fmtFCFA(value)}</span>
            </div>
          </div>
        </div>
      </div>

      {isActive && <ReconcileDialog open={open} onClose={() => setOpen(false)} record={record} />}
    </div>
  );
};

export const ConsignmentShow = () => (
  <Show actions={false} component="div">
    <CelvaSkin>
      <ConsignmentDetailSkin />
    </CelvaSkin>
  </Show>
);
