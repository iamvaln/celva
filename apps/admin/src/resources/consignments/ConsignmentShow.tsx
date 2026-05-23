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
import HandshakeIcon from '@mui/icons-material/Handshake';
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
import type { Consignment } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

const STATUS_COLOR: Record<
  Consignment['status'],
  'warning' | 'success' | 'default'
> = {
  ACTIVE: 'warning',
  RECONCILED: 'success',
  CANCELLED: 'default',
};

const ReconcileButton = () => {
  const record = useRecordContext<Consignment>();
  const t = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Map item id → { sold, returned } strings (we use strings to let the
  // input be empty/typed; convert on submit).
  const [rows, setRows] = useState<Record<string, { sold: string; returned: string }>>({});
  const [notes, setNotes] = useState('');

  if (!record || record.status !== 'ACTIVE') return null;

  const openDialog = () => {
    const initial: Record<string, { sold: string; returned: string }> = {};
    for (const item of record.items) {
      initial[item.id] = {
        sold: '0',
        // Default returned = quantityTaken (most-conservative no-event case).
        returned: String(item.quantityTaken),
      };
    }
    setRows(initial);
    setNotes(record.notes ?? '');
    setOpen(true);
  };

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
      setOpen(false);
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
    <>
      <Button
        label="resources.consignments.actions.reconcile"
        startIcon={<HandshakeIcon />}
        onClick={openDialog}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('resources.consignments.actions.reconcile')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('resources.consignments.dialogs.reconcile_hint')}
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
                    {item.variant.product.name?.fr ?? item.variant.sku} — {item.variant.sku} · taken {taken}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <MuiTextField
                      label={t('resources.consignments.dialogs.sold')}
                      type="number"
                      size="small"
                      value={rows[item.id]?.sold ?? '0'}
                      onChange={(e) =>
                        setRows({
                          ...rows,
                          [item.id]: {
                            ...rows[item.id]!,
                            sold: e.target.value,
                          },
                        })
                      }
                      inputProps={{ min: 0, max: taken }}
                    />
                    <MuiTextField
                      label={t('resources.consignments.dialogs.returned')}
                      type="number"
                      size="small"
                      value={rows[item.id]?.returned ?? '0'}
                      onChange={(e) =>
                        setRows({
                          ...rows,
                          [item.id]: {
                            ...rows[item.id]!,
                            returned: e.target.value,
                          },
                        })
                      }
                      inputProps={{ min: 0, max: taken }}
                    />
                    <MuiTextField
                      label={t('resources.consignments.dialogs.variance')}
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
              label={t('resources.consignments.dialogs.notes')}
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
          <MuiButton onClick={() => setOpen(false)}>{t('ra.action.cancel')}</MuiButton>
          <MuiButton variant="contained" disabled={busy} onClick={submit}>
            {t('ra.action.confirm')}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

const CancelConsignmentButton = () => {
  const record = useRecordContext<Consignment>();
  const t = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);

  if (!record || record.status !== 'ACTIVE') return null;

  const handle = async () => {
    if (!window.confirm(t('resources.consignments.dialogs.cancel_confirm'))) return;
    try {
      setBusy(true);
      await fetchJson(`${API_BASE}/consignments/${record.id}/cancel`, {
        method: 'POST',
      });
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
    <Button
      label="resources.consignments.actions.cancel"
      startIcon={<CancelIcon />}
      onClick={handle}
      disabled={busy}
      sx={{ color: 'error.main' }}
    />
  );
};

const Actions = () => (
  <TopToolbar>
    <ReconcileButton />
    <CancelConsignmentButton />
  </TopToolbar>
);

const Header = () => {
  const record = useRecordContext<Consignment>();
  if (!record) return null;
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
      <Typography variant="h6">{record.salesRep.name}</Typography>
      <Chip
        label={record.status}
        color={STATUS_COLOR[record.status]}
        size="small"
        variant="outlined"
      />
    </Stack>
  );
};

const ItemsTable = () => {
  const record = useRecordContext<Consignment>();
  if (!record) return null;
  return (
    <Box sx={{ mt: 1 }}>
      {record.items.map((it) => (
        <Box
          key={it.id}
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 80px 80px',
            gap: 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="body2">
              {it.variant.product.name?.fr ?? it.variant.sku}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              SKU {it.variant.sku}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ textAlign: 'right' }}>
            ×{it.quantityTaken}
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'right' }}>
            vendu {it.quantitySold}
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'right' }}>
            retour {it.quantityReturned}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export const ConsignmentShow = () => (
  <Show actions={<Actions />}>
    <SimpleShowLayout>
      <Header />
      <Labeled label="resources.consignments.fields.salesRep">
        <FunctionField<Consignment>
          render={(record) => `${record.salesRep.name} · ${record.salesRep.email}`}
        />
      </Labeled>
      <Labeled label="resources.consignments.fields.items">
        <ItemsTable />
      </Labeled>
      <TextField source="notes" emptyText="—" />
      <DateField source="releasedAt" showTime />
      <DateField source="reconciledAt" showTime emptyText="—" />
    </SimpleShowLayout>
  </Show>
);
