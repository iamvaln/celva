import { useState } from 'react';
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
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import InventoryIcon from '@mui/icons-material/Inventory';
import CancelIcon from '@mui/icons-material/Cancel';
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField as MuiTextField,
  Button as MuiButton,
  Typography,
} from '@mui/material';
import type { PurchaseOrder } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

const STATUS_COLOR: Record<
  PurchaseOrder['status'],
  'default' | 'info' | 'warning' | 'success' | 'error'
> = {
  DRAFT: 'default',
  ORDERED: 'info',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'error',
};

const formatXAF = (v: string | number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(v));

const post = async (url: string, body?: unknown): Promise<void> => {
  await fetchJson(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
};

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
    <Button
      label="resources.purchase-orders.actions.order"
      startIcon={<ShoppingCartCheckoutIcon />}
      onClick={handle}
      disabled={busy}
    />
  );
};

const ReceiveButton = () => {
  const record = useRecordContext<PurchaseOrder>();
  const t = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Record<string, string>>({});

  if (!record || (record.status !== 'ORDERED' && record.status !== 'PARTIALLY_RECEIVED')) {
    return null;
  }

  const openDialog = () => {
    const initial: Record<string, string> = {};
    for (const it of record.items) {
      // Default the input to "fully received" (= ordered qty).
      initial[it.id] = String(Number(it.quantity));
    }
    setRows(initial);
    setOpen(true);
  };

  const submit = async () => {
    try {
      setBusy(true);
      const items = record.items.map((it) => ({
        id: it.id,
        quantityReceived: Number(rows[it.id] ?? it.quantityReceived),
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
      <Button
        label="resources.purchase-orders.actions.receive"
        startIcon={<InventoryIcon />}
        onClick={openDialog}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('resources.purchase-orders.actions.receive')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('resources.purchase-orders.dialogs.receive_hint')}
            </Typography>
            {record.items.map((it) => (
              <Box
                key={it.id}
                sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 2, alignItems: 'center' }}
              >
                <Typography variant="body2">
                  {it.rawMaterial.name} — {Number(it.quantityReceived)}/{Number(it.quantity)} {it.rawMaterial.unit}
                </Typography>
                <MuiTextField
                  type="number"
                  size="small"
                  value={rows[it.id] ?? '0'}
                  onChange={(e) => setRows({ ...rows, [it.id]: e.target.value })}
                  inputProps={{ min: Number(it.quantityReceived), max: Number(it.quantity) }}
                />
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>{t('ra.action.cancel')}</MuiButton>
          <MuiButton variant="contained" disabled={busy} onClick={submit}>
            {t('ra.action.confirm')}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

const CancelButton = () => {
  const record = useRecordContext<PurchaseOrder>();
  const t = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  if (!record || (record.status !== 'DRAFT' && record.status !== 'ORDERED')) return null;
  const handle = async () => {
    if (!window.confirm(t('resources.purchase-orders.dialogs.cancel_confirm'))) return;
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
    <Button
      label="resources.purchase-orders.actions.cancel"
      startIcon={<CancelIcon />}
      onClick={handle}
      disabled={busy}
      sx={{ color: 'error.main' }}
    />
  );
};

const Actions = () => (
  <TopToolbar>
    <OrderButton />
    <ReceiveButton />
    <CancelButton />
  </TopToolbar>
);

const Header = () => {
  const record = useRecordContext<PurchaseOrder>();
  if (!record) return null;
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
      <Typography variant="h6">{record.supplier?.name ?? '—'}</Typography>
      <Chip label={record.status} color={STATUS_COLOR[record.status]} size="small" variant="outlined" />
      <Typography variant="h6">{formatXAF(record.totalAmount)}</Typography>
    </Stack>
  );
};

const ItemsTable = () => {
  const record = useRecordContext<PurchaseOrder>();
  if (!record) return null;
  return (
    <Box sx={{ mt: 1 }}>
      {record.items.map((it) => (
        <Box
          key={it.id}
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 100px 100px',
            gap: 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2">{it.rawMaterial.name}</Typography>
          <Typography variant="body2" sx={{ textAlign: 'right' }}>
            ×{Number(it.quantity)} {it.rawMaterial.unit}
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'right' }}>
            {formatXAF(it.unitPrice)}
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'right' }}>
            reçu {Number(it.quantityReceived)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const CostsTable = () => {
  const record = useRecordContext<PurchaseOrder>();
  if (!record || record.costs.length === 0) return null;
  return (
    <Box sx={{ mt: 1 }}>
      {record.costs.map((c) => (
        <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
          <Typography variant="body2">
            {c.type}
            {c.description ? ` — ${c.description}` : ''}
          </Typography>
          <Typography variant="body2">{formatXAF(c.amount)}</Typography>
        </Box>
      ))}
    </Box>
  );
};

export const PurchaseOrderShow = () => (
  <Show actions={<Actions />}>
    <SimpleShowLayout>
      <Header />
      <Labeled label="resources.purchase-orders.fields.items">
        <ItemsTable />
      </Labeled>
      <Labeled label="resources.purchase-orders.fields.costs">
        <CostsTable />
      </Labeled>
      <FunctionField<PurchaseOrder>
        label="resources.purchase-orders.fields.total"
        render={(record) => formatXAF(record.totalAmount)}
      />
      <TextField source="notes" emptyText="—" />
      <DateField source="createdAt" showTime />
    </SimpleShowLayout>
  </Show>
);
