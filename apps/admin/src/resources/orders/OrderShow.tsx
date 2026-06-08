import { useState, useEffect } from 'react';
import {
  Show,
  useNotify,
  useRecordContext,
  useRedirect,
  useRefresh,
  useTranslate,
} from 'react-admin';
import DownloadIcon from '@mui/icons-material/Download';
import PaymentsIcon from '@mui/icons-material/Payments';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhoneIcon from '@mui/icons-material/Phone';
import PlaceIcon from '@mui/icons-material/Place';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  TextField as MuiTextField,
  Button as MuiButton,
  Stack,
  Typography,
} from '@mui/material';
import type { OrderStatus } from '@celva/shared';
import type { AdminOrderDetail, PaymentAccount } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE, STORAGE_KEYS } from '../../config';
import { CelvaSkin } from '../../components/CelvaSkin';
import { ChannelIcon, ORDER_CHANNEL_LABEL, StatusPill, fmtFCFA } from './orderSkin';

/** Spec §7.5 — forward-only steps an admin can pick. */
const ALLOWED_NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED'],
  CONFIRMED: ['PROCESSING'],
  PROCESSING: ['READY'],
  READY: ['SHIPPED', 'DELIVERED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

const TERMINAL: OrderStatus[] = ['COMPLETED', 'CANCELLED'];
const NON_CANCELLABLE: OrderStatus[] = ['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];

/** Real payment methods selectable at encashment (spec §5.5). */
const ENCASHMENT_METHODS = ['CASH_ON_DELIVERY', 'ORANGE_MONEY', 'MTN_MOMO'] as const;

const DELIVERY_MODE_LABEL: Record<string, string> = {
  HOME_DELIVERY: 'Livraison à domicile',
  STAFF_DELIVERY: "Livraison par l'équipe",
  STORE_PICKUP: 'Retrait magasin',
  RELAY_PICKUP: 'Point relais',
};

// Contextual main action label per status (spec §5.1).
const MAIN_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: 'Confirmer la commande',
  CONFIRMED: 'Commencer la préparation',
  PROCESSING: 'Marquer prête',
  READY: 'Assigner / acheminer',
  SHIPPED: 'Marquer livrée',
  DELIVERED: 'Clôturer la commande',
};

// ── Functional actions (preserved behaviour, brand-styled) ──────────────

const TransitionButton = () => {
  const record = useRecordContext<AdminOrderDetail>();
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<OrderStatus | ''>('');
  const [submitting, setSubmitting] = useState(false);

  if (!record) return null;
  const choices = ALLOWED_NEXT[record.status] ?? [];
  if (choices.length === 0) return null;

  const handleSubmit = async () => {
    if (!next) return;
    try {
      setSubmitting(true);
      await fetchJson(`${API_BASE}/orders/${record.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ status: next }),
      });
      notify('resources.orders.notifications.transitioned', { type: 'success' });
      setOpen(false);
      setNext('');
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : translate('ra.notification.http_error'), {
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Single contextual action when there's exactly one next step; otherwise a picker.
  const single = choices.length === 1 ? choices[0] : null;
  const onClick = () => {
    if (single) {
      setNext(single);
      setOpen(true);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <button className="btn btn-primary btn-lg" onClick={onClick}>
        {MAIN_ACTION_LABEL[record.status] ?? translate('resources.orders.actions.transition')}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{translate('resources.orders.actions.transition')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              {translate('resources.orders.dialogs.current_status')}: <strong>{record.status}</strong>
            </Typography>
            <Select
              value={next}
              onChange={(e) => setNext(e.target.value as OrderStatus)}
              displayEmpty
              fullWidth
              size="small"
            >
              <MenuItem value="" disabled>
                {translate('resources.orders.dialogs.pick_next')}
              </MenuItem>
              {choices.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>{translate('ra.action.cancel')}</MuiButton>
          <MuiButton variant="contained" disabled={!next || submitting} onClick={handleSubmit}>
            {translate('ra.action.confirm')}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

const CancelOrderButton = () => {
  const record = useRecordContext<AdminOrderDetail>();
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!record || NON_CANCELLABLE.includes(record.status)) return null;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await fetchJson(`${API_BASE}/orders/${record.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      notify('resources.orders.notifications.cancelled', { type: 'success' });
      setOpen(false);
      setReason('');
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : translate('ra.notification.http_error'), {
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button className="btn btn-quiet btn-danger" style={{ marginLeft: 'auto' }} onClick={() => setOpen(true)}>
        {translate('resources.orders.actions.cancel')}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{translate('resources.orders.actions.cancel')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">{translate('resources.orders.dialogs.cancel_warning')}</Typography>
            <MuiTextField
              label={translate('resources.orders.dialogs.reason')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              inputProps={{ maxLength: 280 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>{translate('ra.action.cancel')}</MuiButton>
          <MuiButton variant="contained" color="error" disabled={submitting} onClick={handleSubmit}>
            {translate('ra.action.confirm')}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

const DownloadInvoiceButton = () => {
  const record = useRecordContext<AdminOrderDetail>();
  const notify = useNotify();
  const translate = useTranslate();
  const [busy, setBusy] = useState(false);

  if (!record || record.payment?.status !== 'COMPLETED') return null;

  const handleClick = async () => {
    try {
      setBusy(true);
      const token = window.localStorage.getItem(STORAGE_KEYS.accessToken);
      const res = await fetch(`${API_BASE}/orders/${record.id}/invoice`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      if (!res.ok) {
        notify('resources.orders.notifications.invoice_failed', { type: 'error' });
        return;
      }
      const disposition = res.headers.get('content-disposition') ?? '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `${record.orderNumber}.pdf`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      notify(translate('ra.notification.http_error'), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className="btn btn-quiet" onClick={handleClick} disabled={busy}>
      <DownloadIcon sx={{ fontSize: 15 }} /> {translate('resources.orders.actions.download_invoice')}
    </button>
  );
};

const ConfirmCashPaymentButton = () => {
  const record = useRecordContext<AdminOrderDetail>();
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [method, setMethod] = useState<string>('CASH_ON_DELIVERY');
  const [accountId, setAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');

  const due = record ? Number(record.total) : 0;

  useEffect(() => {
    if (!open) return;
    setMethod(record?.payment?.method ?? 'CASH_ON_DELIVERY');
    setAmount(String(due));
    let cancelled = false;
    void (async () => {
      try {
        const { body } = await fetchJson<PaymentAccount[]>(`${API_BASE}/payment-accounts`);
        if (cancelled) return;
        const active = body.filter((a) => a.isActive);
        setAccounts(active);
        setAccountId(active[0]?.id ?? '');
      } catch {
        if (!cancelled) setAccounts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, record, due]);

  if (!record || record.payment?.method !== 'CASH_ON_DELIVERY' || record.payment?.status !== 'PENDING') {
    return null;
  }
  const paymentId = record.payment.id;

  const submit = async () => {
    try {
      setBusy(true);
      await fetchJson(`${API_BASE}/payments/${paymentId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          method,
          paymentAccountId: accountId || undefined,
          actualAmount: amount === '' ? undefined : Number(amount),
        }),
      });
      notify('resources.orders.notifications.cash_payment_confirmed', { type: 'success' });
      setOpen(false);
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : translate('ra.notification.http_error'), {
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const discrepancy = amount === '' ? 0 : Number(amount) - due;

  return (
    <>
      <button className="btn btn-primary btn-lg" onClick={() => setOpen(true)}>
        <PaymentsIcon sx={{ fontSize: 16 }} /> {translate('resources.orders.actions.confirm_cash_payment')}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{translate('resources.orders.actions.confirm_cash_payment')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                {translate('resources.orders.dialogs.amount_due')}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {fmtFCFA(due)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {translate('resources.orders.dialogs.real_method')}
              </Typography>
              <Select fullWidth size="small" value={method} onChange={(e) => setMethod(e.target.value)}>
                {ENCASHMENT_METHODS.map((m) => (
                  <MenuItem key={m} value={m}>
                    {translate(`resources.orders.payment_methods.${m}`)}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {translate('resources.orders.dialogs.encashment_account')}
              </Typography>
              <Select fullWidth size="small" value={accountId} onChange={(e) => setAccountId(e.target.value)} displayEmpty>
                {accounts.length === 0 && (
                  <MenuItem value="" disabled>
                    {translate('resources.orders.dialogs.no_account')}
                  </MenuItem>
                )}
                {accounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name} · {a.type}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <MuiTextField
              label={translate('resources.orders.dialogs.amount_collected')}
              type="number"
              size="small"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
            />
            {discrepancy !== 0 && (
              <Typography variant="caption" color="warning.main">
                {translate('resources.orders.dialogs.discrepancy', { amount: fmtFCFA(discrepancy) })}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>{translate('ra.action.cancel')}</MuiButton>
          <MuiButton variant="contained" color="success" disabled={busy} onClick={submit}>
            {translate('resources.orders.actions.confirm_encashment')}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ── Margin card (spec §12.7), brand-styled ──────────────────────────────
type OrderMargin = { revenueHt: string; netMargin: string };

const MarginCard = () => {
  const record = useRecordContext<AdminOrderDetail>();
  const [margin, setMargin] = useState<OrderMargin | null>(null);
  const [denied, setDenied] = useState(false);
  const orderId = record?.id;

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    void fetchJson<OrderMargin>(`${API_BASE}/finance/orders/${orderId}/margin`)
      .then(({ body }) => {
        if (active) setMargin(body);
      })
      .catch(() => {
        if (active) setDenied(true);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  if (!record || denied || !margin) return null;
  const net = Number(margin.netMargin);
  const revenue = Number(margin.revenueHt);
  const pct = revenue > 0 ? Math.round((net / revenue) * 100) : 0;
  return (
    <div className="margin-card">
      <div className="ml">Marge estimée</div>
      <div className="mv num">{fmtFCFA(net)}</div>
      <div className="mp">{pct}% du revenu HT · visible finance uniquement</div>
    </div>
  );
};

// ── Detail layout (design) ──────────────────────────────────────────────

const KV = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="kv-line">
    <span className="k">{k}</span>
    <span className="v">{v}</span>
  </div>
);

const OrderDetailSkin = () => {
  const record = useRecordContext<AdminOrderDetail>();
  const redirect = useRedirect();
  if (!record) return null;

  const created = new Date(record.createdAt).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const d = record.delivery;
  const p = record.payment;
  const discount = Number(record.discount ?? 0);

  return (
    <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
      <button className="back-link" style={{ marginBottom: 16 }} onClick={() => redirect('list', 'orders')}>
        <ArrowBackIcon sx={{ fontSize: 16 }} /> Commandes
      </button>

      {/* Header */}
      <div className="detail-head">
        <div>
          <div className="row" style={{ gap: 14 }}>
            <span className="dh-num">{record.orderNumber}</span>
            <StatusPill status={record.status} />
          </div>
          <div className="dh-meta">
            <span className="row" style={{ gap: 6 }}>
              <ChannelIcon channel={record.channel} size={14} />
              {ORDER_CHANNEL_LABEL[record.channel]}
            </span>
            <span>·</span>
            <span>{created}</span>
          </div>
        </div>
        <div className="dh-actions">
          <ConfirmCashPaymentButton />
          {!TERMINAL.includes(record.status) && <TransitionButton />}
        </div>
      </div>

      {/* Secondary actions */}
      <div className="secondary-actions">
        <DownloadInvoiceButton />
        <CancelOrderButton />
      </div>

      <div className="detail-grid">
        {/* Left column */}
        <div className="grid">
          <div className="info-card">
            <h4>Articles</h4>
            {/* The list-view record is hydrated first (items lack `variant`)
                before getOne completes — render only fully-loaded items. */}
            {record.items
              .filter((it) => it.variant)
              .map((it) => (
                <div className="item-line" key={it.id}>
                  <div className="ithumb">
                    <Inventory2Icon sx={{ fontSize: 20 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="iname">{it.variant.product?.name?.fr ?? it.variant.sku}</div>
                    <div className="ivar">{it.variant.sku}</div>
                    <div className="iqty">
                      Qté {it.quantity}
                      {it.variant.storageLocation && (
                        <>
                          {' · '}
                          <span className="iloc">📍 {it.variant.storageLocation}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="iprice num">{fmtFCFA(Number(it.unitPrice) * it.quantity)}</div>
                </div>
              ))}
            <div className="divider" style={{ margin: '8px 0' }} />
            <div className="fin-line">
              <span className="k muted">Sous-total</span>
              <span className="v num">{fmtFCFA(record.subtotal)}</span>
            </div>
            <div className="fin-line">
              <span className="muted">Livraison</span>
              <span className="num">{fmtFCFA(record.deliveryFee)}</span>
            </div>
            {discount > 0 && (
              <div className="fin-line">
                <span className="muted">Réduction{record.promoCode ? ` (${record.promoCode.code})` : ''}</span>
                <span className="num accent">− {fmtFCFA(discount)}</span>
              </div>
            )}
            <div className="fin-line total">
              <span>
                Total TTC
                {record.taxAmount != null && Number(record.taxAmount) > 0 && (
                  <span className="vat"> dont TVA {fmtFCFA(record.taxAmount)}</span>
                )}
              </span>
              <span className="v num">{fmtFCFA(record.total)}</span>
            </div>
          </div>

          {record.notes && (
            <div className="info-card">
              <h4>Notes</h4>
              <div style={{ fontSize: 15 }}>{record.notes}</div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="grid">
          <div className="info-card">
            <h4>Cliente</h4>
            <div style={{ fontSize: 17, fontWeight: 500, fontFamily: 'var(--font-display)' }}>
              {record.user.name}
            </div>
            <div className="client-context">{record.user.email}</div>
            {record.user.phone && (
              <div className="row" style={{ gap: 8, fontSize: 14.5, marginTop: 12 }}>
                <PhoneIcon sx={{ fontSize: 15, color: 'var(--fg-muted)' }} />
                {record.user.phone}
              </div>
            )}
            {(d?.shippingAddress || d?.shippingCity) && (
              <div className="row" style={{ gap: 8, fontSize: 14.5, marginTop: 6 }}>
                <PlaceIcon sx={{ fontSize: 15, color: 'var(--fg-muted)' }} />
                {[d?.shippingAddress, d?.shippingCity].filter(Boolean).join(', ')}
              </div>
            )}
          </div>

          {p && (
            <div className="info-card">
              <h4>Paiement</h4>
              <KV k="Moyen" v={p.method} />
              <KV k="Statut" v={p.status} />
              <KV k="Référence" v={p.transactionRef ?? '—'} />
              {p.paidAt && <KV k="Payé le" v={new Date(p.paidAt).toLocaleString('fr-FR')} />}
            </div>
          )}

          {d && (
            <div className="info-card">
              <h4>Livraison</h4>
              <KV k="Mode" v={DELIVERY_MODE_LABEL[d.mode] ?? d.mode} />
              {d.pickupPoint && <KV k="Point" v={d.pickupPoint.name.fr} />}
              {d.shippingAddress && <KV k="Adresse" v={d.shippingAddress} />}
              <KV k="Frais" v={fmtFCFA(record.deliveryFee)} />
              {record.status === 'READY' && (
                <div className="note" style={{ marginTop: 8, fontStyle: 'italic' }}>
                  Le livreur sera assigné à l’acheminement.
                </div>
              )}
            </div>
          )}

          <MarginCard />
        </div>
      </div>
    </div>
  );
};

export const OrderShow = () => (
  <Show actions={false} component="div">
    <CelvaSkin>
      <OrderDetailSkin />
    </CelvaSkin>
  </Show>
);
