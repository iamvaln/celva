import { useState, useEffect } from 'react';
import {
  Button,
  DateField,
  FunctionField,
  Labeled,
  Show,
  SimpleShowLayout,
  TextField,
  TopToolbar,
  useNotify,
  useRecordContext,
  useRefresh,
  useTranslate,
} from 'react-admin';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';
import PaymentsIcon from '@mui/icons-material/Payments';
import {
  Box,
  Chip,
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
import type { AdminOrderDetail } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE, STORAGE_KEYS } from '../../config';
import { ORDER_STATUS_COLOR, PAYMENT_STATUS_COLOR } from './statusColors';

/** Spec §7.5 — these are the only forward-only steps an admin can pick. */
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

const formatXAF = (value: string | number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));

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
  const disabled = choices.length === 0;

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

  return (
    <>
      <Button
        label="resources.orders.actions.transition"
        onClick={() => setOpen(true)}
        startIcon={<LocalShippingIcon />}
        disabled={disabled}
      />
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
          <MuiButton onClick={() => setOpen(false)}>
            {translate('ra.action.cancel')}
          </MuiButton>
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

  if (!record) return null;
  const disabled = NON_CANCELLABLE.includes(record.status);

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
      <Button
        label="resources.orders.actions.cancel"
        onClick={() => setOpen(true)}
        startIcon={<CancelIcon />}
        disabled={disabled}
        sx={{ color: disabled ? undefined : 'error.main' }}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{translate('resources.orders.actions.cancel')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              {translate('resources.orders.dialogs.cancel_warning')}
            </Typography>
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
          <MuiButton onClick={() => setOpen(false)}>
            {translate('ra.action.cancel')}
          </MuiButton>
          <MuiButton
            variant="contained"
            color="error"
            disabled={submitting}
            onClick={handleSubmit}
          >
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

  if (!record) return null;
  const ready = record.payment?.status === 'COMPLETED';
  if (!ready) return null;

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
    <Button
      label="resources.orders.actions.download_invoice"
      onClick={handleClick}
      startIcon={<DownloadIcon />}
      disabled={busy}
    />
  );
};

/**
 * Confirms COD payment receipt. Shown only for cash-on-delivery orders whose
 * Payment is still PENDING — `POST /payments/:id/confirm` atomically marks
 * the Payment COMPLETED, books an INCOME/SALE transaction, and produces the
 * invoice row.
 */
const ConfirmCashPaymentButton = () => {
  const record = useRecordContext<AdminOrderDetail>();
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (
    !record ||
    !record.payment ||
    record.payment.method !== 'CASH_ON_DELIVERY' ||
    record.payment.status !== 'PENDING'
  ) {
    return null;
  }
  const paymentId = record.payment.id;

  const submit = async () => {
    try {
      setBusy(true);
      await fetchJson(`${API_BASE}/payments/${paymentId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({}),
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

  return (
    <>
      <Button
        label="resources.orders.actions.confirm_cash_payment"
        onClick={() => setOpen(true)}
        startIcon={<PaymentsIcon />}
        sx={{ color: 'success.main' }}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{translate('resources.orders.actions.confirm_cash_payment')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {translate('resources.orders.dialogs.confirm_cash_payment_warning')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>{translate('ra.action.cancel')}</MuiButton>
          <MuiButton variant="contained" color="success" disabled={busy} onClick={submit}>
            {translate('ra.action.confirm')}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

const OrderShowActions = () => {
  const record = useRecordContext<AdminOrderDetail>();
  if (!record) return <TopToolbar />;
  return (
    <TopToolbar>
      <DownloadInvoiceButton />
      <ConfirmCashPaymentButton />
      {!TERMINAL.includes(record.status) && <TransitionButton />}
      {!NON_CANCELLABLE.includes(record.status) && <CancelOrderButton />}
    </TopToolbar>
  );
};

const OrderHeader = () => {
  const record = useRecordContext<AdminOrderDetail>();
  if (!record) return null;
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
      <Typography variant="h6">{record.orderNumber}</Typography>
      <Chip
        label={record.status}
        color={ORDER_STATUS_COLOR[record.status]}
        size="small"
        variant="outlined"
      />
      <Chip label={record.channel} size="small" variant="outlined" />
    </Stack>
  );
};

const ItemsTable = () => {
  const record = useRecordContext<AdminOrderDetail>();
  if (!record) return null;
  return (
    <Box sx={{ mt: 1 }}>
      {record.items.map((it) => (
        <Box
          key={it.id}
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 120px 120px',
            gap: 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="body2">
              {it.variant.product.name.fr}
              {it.variant.product.name.en && ` / ${it.variant.product.name.en}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              SKU {it.variant.sku}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ textAlign: 'right' }}>
            ×{it.quantity}
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'right' }}>
            {formatXAF(it.unitPrice)}
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 600 }}>
            {formatXAF(it.lineTotal)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const DeliveryBlock = () => {
  const record = useRecordContext<AdminOrderDetail>();
  if (!record?.delivery) return null;
  const d = record.delivery;
  return (
    <Box>
      <Typography variant="body2">
        <strong>{d.mode === 'HOME_DELIVERY' ? 'Livraison à domicile' : 'Retrait en boutique'}</strong>
      </Typography>
      {d.mode === 'HOME_DELIVERY' ? (
        <Typography variant="body2" color="text.secondary">
          {d.shippingAddress}, {d.shippingCity} · {d.shippingPhone}
        </Typography>
      ) : d.pickupPoint ? (
        <Typography variant="body2" color="text.secondary">
          {d.pickupPoint.name.fr}
        </Typography>
      ) : null}
      <Typography variant="caption" color="text.secondary">
        Frais : {formatXAF(d.fee)}
      </Typography>
    </Box>
  );
};

const PaymentBlock = () => {
  const record = useRecordContext<AdminOrderDetail>();
  if (!record?.payment) return null;
  const p = record.payment;
  return (
    <Stack spacing={0.5}>
      <Box>
        <Chip
          label={`${p.method} · ${p.status}`}
          size="small"
          color={PAYMENT_STATUS_COLOR[p.status]}
          variant="outlined"
        />
      </Box>
      {p.phoneNumber && (
        <Typography variant="caption" color="text.secondary">
          {p.phoneNumber}
        </Typography>
      )}
      {p.transactionRef && (
        <Typography variant="caption" color="text.secondary">
          ref: {p.transactionRef}
        </Typography>
      )}
      {p.paidAt && (
        <Typography variant="caption" color="text.secondary">
          {new Date(p.paidAt).toLocaleString('fr-FR')}
        </Typography>
      )}
    </Stack>
  );
};

const Totals = () => {
  const record = useRecordContext<AdminOrderDetail>();
  if (!record) return null;
  return (
    <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
      <Typography variant="body2">Sous-total : {formatXAF(record.subtotal)}</Typography>
      <Typography variant="body2">Livraison : {formatXAF(record.deliveryFee)}</Typography>
      {record.discount && Number(record.discount) > 0 && (
        <Typography variant="body2">
          Remise{record.promoCode ? ` (${record.promoCode.code})` : ''} : −
          {formatXAF(record.discount)}
        </Typography>
      )}
      <Typography variant="h6">Total : {formatXAF(record.total)}</Typography>
    </Stack>
  );
};

type OrderMargin = {
  saleTtc: string;
  tax: string;
  revenueHt: string;
  productCost: string;
  packagingCost: string;
  deliveryCost: string;
  commissions: string;
  netMargin: string;
};

/** Per-order net margin (spec §12.7), fetched from /finance/orders/:id/margin. */
const MarginPanel = () => {
  const record = useRecordContext<AdminOrderDetail>();
  const t = useTranslate();
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

  if (!record || denied) return null;
  if (!margin) return <Typography variant="body2" color="text.secondary">…</Typography>;

  const negative = Number(margin.netMargin) < 0;
  return (
    <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
      <Typography variant="body2">
        {t('resources.orders.margin.revenue_ht')} : {formatXAF(margin.revenueHt)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        − {t('resources.orders.margin.product_cost')} : {formatXAF(margin.productCost)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        − {t('resources.orders.margin.packaging_cost')} : {formatXAF(margin.packagingCost)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        − {t('resources.orders.margin.delivery_cost')} : {formatXAF(margin.deliveryCost)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        − {t('resources.orders.margin.commissions')} : {formatXAF(margin.commissions)}
      </Typography>
      <Typography variant="h6" color={negative ? 'error.main' : 'success.main'}>
        {t('resources.orders.margin.net_margin')} : {formatXAF(margin.netMargin)}
      </Typography>
    </Stack>
  );
};

export const OrderShow = () => (
  <Show actions={<OrderShowActions />}>
    <SimpleShowLayout>
      <OrderHeader />
      <Labeled label="resources.orders.fields.client">
        <FunctionField<AdminOrderDetail>
          render={(record) =>
            `${record.user.name} · ${record.user.email}${record.user.phone ? ` · ${record.user.phone}` : ''}`
          }
        />
      </Labeled>
      <Labeled label="resources.orders.fields.items">
        <ItemsTable />
      </Labeled>
      <Labeled label="resources.orders.fields.delivery">
        <DeliveryBlock />
      </Labeled>
      <Labeled label="resources.orders.fields.payment">
        <PaymentBlock />
      </Labeled>
      <Labeled label="resources.orders.fields.totals">
        <Totals />
      </Labeled>
      <Labeled label="resources.orders.margin.heading" fullWidth>
        <MarginPanel />
      </Labeled>
      <TextField source="notes" label="resources.orders.fields.notes" />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
    </SimpleShowLayout>
  </Show>
);
