import './purchase-orders.css';
import { useState } from 'react';
import {
  Show,
  useNotify,
  useRecordContext,
  useRedirect,
  useRefresh,
  useTranslate,
} from 'react-admin';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button as MuiButton,
} from '@mui/material';
import type { PurchaseOrder } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';
import { CelvaSkin } from '../../components/CelvaSkin';
import { fmtFCFA } from '../orders/orderSkin';

type POStatus = PurchaseOrder['status'];
type POItem = PurchaseOrder['items'][number];
type POCost = PurchaseOrder['costs'][number];

/** Status → translation key (shared `ui.purchase-orders.*`) + design status-class. */
const PO_STATUS_SKIN: Record<POStatus, { key: string; sc: string }> = {
  DRAFT: { key: 'status_draft', sc: 's-neutral' },
  ORDERED: { key: 'status_ordered', sc: 's-info' },
  PARTIALLY_RECEIVED: { key: 'status_partially_received', sc: 's-todo' },
  RECEIVED: { key: 'status_received', sc: 's-done' },
  CANCELLED: { key: 'status_cancelled', sc: 's-neutral' },
};

/** Ancillary cost type → translation key (under `ui.po_show.cost_*`). */
const COST_TYPE_KEY: Record<POCost['type'], string> = {
  TRANSPORT: 'cost_transport',
  CUSTOMS: 'cost_customs',
  BUYER_COMMISSION: 'cost_buyer_commission',
  INSURANCE: 'cost_insurance',
  OTHER: 'cost_other',
};

const num = (v: string | number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(v));

const dateFr = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

const post = async (url: string, body?: unknown): Promise<void> => {
  await fetchJson(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
};

const POStatusPill = ({ status }: { status: POStatus }) => {
  const t = useTranslate();
  const s = PO_STATUS_SKIN[status];
  return (
    <span className={`pill ${s.sc}`}>
      <span className="pdot" />
      {t('ui.purchase-orders.' + s.key)}
    </span>
  );
};

// ── Functional actions (preserved behaviour, brand-styled) ────────────────

/** DRAFT → ORDERED. Same endpoint as before. */
const OrderButton = () => {
  const record = useRecordContext<PurchaseOrder>();
  const t = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  if (!record || record.status !== 'DRAFT') return null;
  const handle = async () => {
    try {
      setBusy(true);
      await post(`${API_BASE}/purchase-orders/${record.id}/order`);
      notify('resources.purchase-orders.notifications.ordered', { type: 'success' });
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <button className="btn btn-primary btn-lg" onClick={handle} disabled={busy}>
      {t('ui.po_show.action_order')}
    </button>
  );
};

/** ORDERED | PARTIALLY_RECEIVED → receive (line-by-line). Same endpoint. */
const ReceiveButton = ({ variant = 'primary' }: { variant?: 'primary' | 'ghost' }) => {
  const record = useRecordContext<PurchaseOrder>();
  const t = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Record<string, number>>({});

  if (!record || (record.status !== 'ORDERED' && record.status !== 'PARTIALLY_RECEIVED')) {
    return null;
  }

  const openDialog = () => {
    // Default each line to its remaining (ordered − already received) quantity.
    const initial: Record<string, number> = {};
    for (const it of record.items) {
      initial[it.id] = Math.max(0, Number(it.quantity) - Number(it.quantityReceived));
    }
    setRows(initial);
    setOpen(true);
  };

  const setQty = (it: POItem, v: number) => {
    const remaining = Number(it.quantity) - Number(it.quantityReceived);
    const clamped = Math.max(0, Math.min(remaining, v));
    setRows((r) => ({ ...r, [it.id]: clamped }));
  };

  const anyReceiving = record.items.some((it) => (rows[it.id] ?? 0) > 0);
  const isPartial = record.items.some(
    (it) => Number(it.quantityReceived) + (rows[it.id] ?? 0) < Number(it.quantity),
  );

  const submit = async () => {
    try {
      setBusy(true);
      // Payload carries the new CUMULATIVE received total per item.
      const items = record.items.map((it) => ({
        id: it.id,
        quantityReceived: Number(it.quantityReceived) + (rows[it.id] ?? 0),
      }));
      await post(`${API_BASE}/purchase-orders/${record.id}/receive`, { items });
      notify('resources.purchase-orders.notifications.received', { type: 'success' });
      setOpen(false);
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        className={variant === 'primary' ? 'btn btn-primary btn-lg' : 'btn btn-ghost'}
        onClick={openDialog}
      >
        <LocalShippingIcon sx={{ fontSize: 16 }} /> {t('ui.po_show.action_receive')}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('ui.po_show.receive_title')}</DialogTitle>
        <DialogContent>
          <div className="po-recv-wrap">
            <table className="recv-table">
              <thead>
                <tr>
                  <th>{t('ui.po_show.col_material')}</th>
                  <th>{t('ui.po_show.col_ordered')}</th>
                  <th>{t('ui.po_show.col_already_received')}</th>
                  <th>{t('ui.po_show.col_receiving_now')}</th>
                </tr>
              </thead>
              <tbody>
                {record.items.map((it) => {
                  const ordered = Number(it.quantity);
                  const already = Number(it.quantityReceived);
                  const remaining = ordered - already;
                  const val = rows[it.id] ?? 0;
                  const full = already + val >= ordered;
                  return (
                    <tr key={it.id} className={full ? 'full' : ''}>
                      <td>
                        <div className="lt-name">{it.rawMaterial.name}</div>
                        <div className="lt-ref">{it.rawMaterial.unit}</div>
                      </td>
                      <td className="num">{num(ordered)}</td>
                      <td className="already num">{already ? num(already) : '—'}</td>
                      <td>
                        <div className="recv-step" style={{ float: 'right' }}>
                          <button type="button" onClick={() => setQty(it, val - 1)}>
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            value={val}
                            onChange={(e) => setQty(it, Number(e.target.value) || 0)}
                          />
                          <button type="button" onClick={() => setQty(it, val + 1)}>
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {anyReceiving && isPartial && (
            <div className="anticipate warn" style={{ marginTop: 16 }}>
              <WarningAmberIcon className="ic" />
              <div>
                <div className="at">{t('ui.po_show.partial_title')}</div>
                <div className="ab">{t('ui.po_show.partial_hint')}</div>
              </div>
            </div>
          )}
          <div className="anticipate" style={{ marginTop: 14 }}>
            <CheckCircleOutlineIcon className="ic" />
            <div>
              <div className="at">{t('ui.po_show.on_validation_title')}</div>
              <div className="ab">{t('ui.po_show.on_validation_hint')}</div>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>{t('ra.action.cancel')}</MuiButton>
          <MuiButton variant="contained" disabled={busy || !anyReceiving} onClick={submit}>
            {t('ui.po_show.receive_confirm')}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

/** DRAFT | ORDERED → cancel. Same endpoint + confirm. */
const CancelButton = () => {
  const record = useRecordContext<PurchaseOrder>();
  const t = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  if (!record || (record.status !== 'DRAFT' && record.status !== 'ORDERED')) return null;
  const handle = async () => {
    if (!window.confirm(t('ui.po_show.cancel_confirm'))) return;
    try {
      setBusy(true);
      await post(`${API_BASE}/purchase-orders/${record.id}/cancel`);
      notify('resources.purchase-orders.notifications.cancelled', { type: 'success' });
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <button className="btn btn-quiet btn-danger" style={{ marginLeft: 'auto' }} onClick={handle} disabled={busy}>
      {t('ui.po_show.action_cancel')}
    </button>
  );
};

// ── Detail layout (design) ────────────────────────────────────────────────

const KV = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="kv-line">
    <span className="k">{k}</span>
    <span className="v">{v}</span>
  </div>
);

const PurchaseOrderDetailSkin = () => {
  const record = useRecordContext<PurchaseOrder>();
  const redirect = useRedirect();
  const t = useTranslate();
  if (!record) return null;

  const itemsTotal = record.items.reduce(
    (s, it) => s + Number(it.quantity) * Number(it.unitPrice),
    0,
  );
  const feesTotal = record.costs.reduce((s, c) => s + Number(c.amount), 0);
  const landed = itemsTotal + feesTotal;
  const feePct = itemsTotal > 0 ? Math.round((feesTotal / itemsTotal) * 100) : 0;
  const lineCount = record.items.length;
  const canReceive = record.status === 'ORDERED' || record.status === 'PARTIALLY_RECEIVED';

  return (
    <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
      <button
        className="back-link"
        style={{ marginBottom: 16 }}
        onClick={() => redirect('list', 'purchase-orders')}
      >
        <ArrowBackIcon sx={{ fontSize: 16 }} /> {t('ui.po_show.back')}
      </button>

      {/* Header */}
      <div className="detail-head">
        <div>
          <div className="row" style={{ gap: 14 }}>
            <span className="dh-num">{record.supplier?.name ?? '—'}</span>
            <POStatusPill status={record.status} />
          </div>
          <div className="dh-meta">
            <span>{dateFr(record.createdAt)}</span>
            <span>·</span>
            <span>
              {lineCount}{' '}
              {lineCount > 1 ? t('ui.po_show.lines') : t('ui.po_show.line')}
            </span>
          </div>
        </div>
        <div className="dh-actions">
          <OrderButton />
          <ReceiveButton />
        </div>
      </div>

      {/* Secondary actions */}
      <div className="secondary-actions">
        <CancelButton />
      </div>

      <div className="detail-grid">
        {/* Left column — items + landed-cost recap */}
        <div className="grid">
          <div className="info-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px 6px' }}>
              <h4 style={{ margin: 0 }}>{t('ui.po_show.card_items')}</h4>
            </div>
            <table className="line-table">
              <thead>
                <tr>
                  <th>{t('ui.po_show.col_material')}</th>
                  <th className="rt">{t('ui.po_show.col_qty')}</th>
                  <th className="rt">{t('ui.po_show.col_unit_price')}</th>
                  <th className="rt">{t('ui.po_show.col_line_total')}</th>
                </tr>
              </thead>
              <tbody>
                {record.items.map((it) => {
                  const ordered = Number(it.quantity);
                  const received = Number(it.quantityReceived);
                  const full = received >= ordered;
                  return (
                    <tr key={it.id}>
                      <td>
                        <div className="lt-name">{it.rawMaterial.name}</div>
                        <div className="lt-ref">{it.rawMaterial.unit}</div>
                      </td>
                      <td className="rt">
                        <span className="num">
                          {num(ordered)} {it.rawMaterial.unit}
                        </span>
                        <div className={`po-recv-tag${full ? ' full' : ''}`}>
                          {t('ui.po_show.received_n', {
                            received: num(received),
                            ordered: num(ordered),
                          })}
                        </div>
                      </td>
                      <td className="rt num">{fmtFCFA(it.unitPrice)}</td>
                      <td className="rt num">{fmtFCFA(ordered * Number(it.unitPrice))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Landed-cost recap (coût rendu) */}
          <div className="recap">
            <div className="rc-line">
              <span className="muted">{t('ui.po_show.items_subtotal')}</span>
              <span className="num">{fmtFCFA(itemsTotal)}</span>
            </div>
            <div className="rc-line">
              <span className="muted">{t('ui.po_show.ancillary_fees')}</span>
              <span className="num">{fmtFCFA(feesTotal)}</span>
            </div>
            <div className="rc-line total">
              <span>{t('ui.po_show.landed_cost')}</span>
              <span className="v num">{fmtFCFA(landed)}</span>
            </div>
            <div className="rc-note">
              {feesTotal > 0
                ? t('ui.po_show.fees_note', { pct: feePct, count: lineCount })
                : t('ui.po_show.no_fees_note')}
            </div>
          </div>

          {/* Ancillary cost breakdown */}
          {record.costs.length > 0 && (
            <div className="info-card">
              <h4>{t('ui.po_show.card_fees')}</h4>
              {record.costs.map((c) => (
                <div className="fin-line" key={c.id}>
                  <span className="muted">
                    {t('ui.po_show.' + COST_TYPE_KEY[c.type])}
                    {c.description ? ` — ${c.description}` : ''}
                  </span>
                  <span className="num">{fmtFCFA(c.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {canReceive && (
            <div className="anticipate">
              <Inventory2Icon className="ic" />
              <div>
                <div className="at">{t('ui.po_show.on_reception_title')}</div>
                <div className="ab">{t('ui.po_show.on_reception_hint')}</div>
              </div>
            </div>
          )}
        </div>

        {/* Right column — supplier, status/dates, totals */}
        <div className="grid">
          <div className="info-card">
            <h4>{t('ui.po_show.card_supplier')}</h4>
            <div style={{ fontSize: 17, fontWeight: 500, fontFamily: 'var(--font-display)' }}>
              {record.supplier?.name ?? '—'}
            </div>
            {record.createdBy && (
              <div className="note" style={{ marginTop: 6 }}>
                {t('ui.po_show.created_by', { name: record.createdBy.name })}
              </div>
            )}
          </div>

          <div className="info-card">
            <h4>{t('ui.po_show.card_status')}</h4>
            <KV
              k={t('ui.po_show.kv_status')}
              v={<POStatusPill status={record.status} />}
            />
            <KV k={t('ui.po_show.kv_created_at')} v={dateFr(record.createdAt)} />
            <KV k={t('ui.po_show.kv_lines')} v={lineCount} />
          </div>

          <div className="info-card">
            <h4>{t('ui.po_show.card_totals')}</h4>
            <div className="fin-line">
              <span className="muted">{t('ui.po_show.items_subtotal')}</span>
              <span className="num">{fmtFCFA(itemsTotal)}</span>
            </div>
            <div className="fin-line">
              <span className="muted">{t('ui.po_show.ancillary_fees')}</span>
              <span className="num">{fmtFCFA(feesTotal)}</span>
            </div>
            <div className="fin-line total">
              <span>{t('ui.po_show.landed_cost')}</span>
              <span className="v num">{fmtFCFA(landed)}</span>
            </div>
          </div>

          {record.notes && (
            <div className="info-card">
              <h4>{t('ui.po_show.card_notes')}</h4>
              <div style={{ fontSize: 15 }}>{record.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const PurchaseOrderShow = () => (
  <Show actions={false} component="div">
    <CelvaSkin>
      <PurchaseOrderDetailSkin />
    </CelvaSkin>
  </Show>
);
