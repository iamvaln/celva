import { useState, useEffect, useCallback } from 'react';
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField as MuiTextField,
  Typography,
  Button as MuiButton,
} from '@mui/material';
import type { Delivery } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';
import { DELIVERY_STATUS_COLOR } from './statusColors';

type DeliveryStatus = Delivery['status'];

/**
 * Allowed next statuses per delivery state. Mirrors the API
 * (apps/api/src/modules/deliveries/deliveries.service.ts:ALLOWED_TRANSITIONS).
 */
const ALLOWED_NEXT: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING: ['ASSIGNED', 'PICKED_UP', 'FAILED'],
  ASSIGNED: ['PICKED_UP', 'FAILED'],
  PICKED_UP: ['IN_TRANSIT', 'DELIVERED', 'FAILED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: [],
};

const formatXAF = (value: string | number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));

// ─── Action: transition status ──────────────────────────────────────────

const TransitionButton = () => {
  const record = useRecordContext<Delivery>();
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<DeliveryStatus | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!record) return null;
  const choices = ALLOWED_NEXT[record.status] ?? [];
  if (choices.length === 0) return null;

  const submit = async () => {
    if (!next) return;
    try {
      setBusy(true);
      await fetchJson(`${API_BASE}/deliveries/${record.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({
          status: next,
          trackingNote: note.trim() ? note.trim() : undefined,
        }),
      });
      notify('resources.deliveries.notifications.transitioned', { type: 'success' });
      setOpen(false);
      setNext('');
      setNote('');
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
        label="resources.deliveries.actions.transition"
        onClick={() => setOpen(true)}
        startIcon={<LocalShippingIcon />}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{translate('resources.deliveries.actions.transition')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              {translate('resources.deliveries.dialogs.current_status')}:{' '}
              <strong>{record.status}</strong>
            </Typography>
            <Select
              value={next}
              onChange={(e) => setNext(e.target.value as DeliveryStatus)}
              displayEmpty
              fullWidth
              size="small"
            >
              <MenuItem value="" disabled>
                {translate('resources.deliveries.dialogs.pick_next')}
              </MenuItem>
              {choices.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
            <MuiTextField
              label={translate('resources.deliveries.dialogs.note')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              inputProps={{ maxLength: 500 }}
              helperText={translate('resources.deliveries.dialogs.note_hint')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>
            {translate('ra.action.cancel')}
          </MuiButton>
          <MuiButton variant="contained" disabled={!next || busy} onClick={submit}>
            {translate('ra.action.confirm')}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ─── Action: edit metadata (cost + note) ────────────────────────────────

const EditMetadataButton = () => {
  const record = useRecordContext<Delivery>();
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const [cost, setCost] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!record) return null;

  const openDialog = () => {
    setCost(String(Number(record.actualCost) || 0));
    setNote(record.trackingNote ?? '');
    setOpen(true);
  };

  const submit = async () => {
    try {
      setBusy(true);
      const body: { actualCost?: number; trackingNote?: string } = {};
      const parsed = Number(cost);
      if (Number.isFinite(parsed)) body.actualCost = parsed;
      body.trackingNote = note;
      await fetchJson(`${API_BASE}/deliveries/${record.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      notify('resources.deliveries.notifications.updated', { type: 'success' });
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
        label="resources.deliveries.actions.edit_metadata"
        onClick={openDialog}
        startIcon={<EditIcon />}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{translate('resources.deliveries.actions.edit_metadata')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <MuiTextField
              label={translate('resources.deliveries.fields.actualCost')}
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              fullWidth
              helperText={translate('resources.deliveries.helpers.actual_cost')}
              inputProps={{ min: 0, step: 50 }}
            />
            <MuiTextField
              label={translate('resources.deliveries.fields.trackingNote')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              inputProps={{ maxLength: 500 }}
              helperText={translate('resources.deliveries.dialogs.note_hint')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>
            {translate('ra.action.cancel')}
          </MuiButton>
          <MuiButton variant="contained" disabled={busy} onClick={submit}>
            {translate('ra.action.save')}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ─── Packaging consumption (spec §12.6) ─────────────────────────────────

type PackagingMaterial = { id: string; name: string; unit: string; unitPrice: string | number };
type PackagingItem = { id: string; quantity: string | number; rawMaterial: PackagingMaterial };
type PackagingData = { items: PackagingItem[]; totalCost: string };

const PackagingPanel = () => {
  const record = useRecordContext<Delivery>();
  const translate = useTranslate();
  const notify = useNotify();
  const [data, setData] = useState<PackagingData | null>(null);
  const [materials, setMaterials] = useState<PackagingMaterial[]>([]);
  const [materialId, setMaterialId] = useState('');
  const [qty, setQty] = useState('1');
  const [busy, setBusy] = useState(false);
  const deliveryId = record?.id;

  const load = useCallback(async () => {
    if (!deliveryId) return;
    const { body } = await fetchJson<PackagingData>(
      `${API_BASE}/deliveries/${deliveryId}/packaging`,
    );
    setData(body);
  }, [deliveryId]);

  useEffect(() => {
    void load().catch(() => setData({ items: [], totalCost: '0.00' }));
    void fetchJson<{ data: PackagingMaterial[] }>(
      `${API_BASE}/raw-materials?type=PACKAGING&pageSize=100`,
    )
      .then(({ body }) => setMaterials(body.data))
      .catch(() => setMaterials([]));
  }, [load]);

  if (!record) return null;

  const add = async () => {
    const quantity = Number(qty);
    if (!materialId || !Number.isFinite(quantity) || quantity <= 0) return;
    try {
      setBusy(true);
      await fetchJson(`${API_BASE}/deliveries/${deliveryId}/packaging`, {
        method: 'POST',
        body: JSON.stringify({ rawMaterialId: materialId, quantity }),
      });
      notify('resources.deliveries.packaging.recorded', { type: 'success' });
      setMaterialId('');
      setQty('1');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : translate('ra.notification.http_error'), {
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await fetchJson(`${API_BASE}/deliveries/${deliveryId}/packaging/${id}`, {
        method: 'DELETE',
      });
      notify('resources.deliveries.packaging.removed', { type: 'success' });
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : translate('ra.notification.http_error'), {
        type: 'error',
      });
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      {data && data.items.length > 0 ? (
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          {data.items.map((it) => (
            <Box
              key={it.id}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
            >
              <Typography variant="body2">
                {it.rawMaterial.name} — {Number(it.quantity)} {it.rawMaterial.unit} ×{' '}
                {formatXAF(it.rawMaterial.unitPrice)}
              </Typography>
              <IconButton
                size="small"
                onClick={() => void remove(it.id)}
                aria-label={translate('resources.deliveries.packaging.remove')}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2">
            <strong>
              {translate('resources.deliveries.packaging.total')} : {formatXAF(data.totalCost)}
            </strong>
          </Typography>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {translate('resources.deliveries.packaging.empty')}
        </Typography>
      )}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Select
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          displayEmpty
          size="small"
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="" disabled>
            {translate('resources.deliveries.packaging.material')}
          </MenuItem>
          {materials.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.name} ({formatXAF(m.unitPrice)}/{m.unit})
            </MenuItem>
          ))}
        </Select>
        <MuiTextField
          type="number"
          size="small"
          label={translate('resources.deliveries.packaging.quantity')}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          inputProps={{ min: 0, step: 1 }}
          sx={{ width: 110 }}
        />
        <MuiButton variant="outlined" disabled={busy || !materialId} onClick={() => void add()}>
          {translate('resources.deliveries.packaging.add')}
        </MuiButton>
      </Stack>
    </Box>
  );
};

// ─── Show layout ────────────────────────────────────────────────────────

const Header = () => {
  const record = useRecordContext<Delivery>();
  if (!record) return null;
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
      <Typography variant="h6">{record.order.orderNumber}</Typography>
      <Chip
        label={record.status}
        color={DELIVERY_STATUS_COLOR[record.status]}
        size="small"
        variant="outlined"
      />
      <Chip label={record.mode} size="small" variant="outlined" />
    </Stack>
  );
};

const Recipient = () => {
  const record = useRecordContext<Delivery>();
  if (!record) return null;
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2">
        {record.order.user.name} · {record.order.user.email}
      </Typography>
      {record.order.user.phone && (
        <Typography variant="body2" color="text.secondary">
          {record.order.user.phone}
        </Typography>
      )}
    </Stack>
  );
};

const DestinationBlock = () => {
  const record = useRecordContext<Delivery>();
  if (!record) return null;
  if (record.mode === 'HOME_DELIVERY') {
    return (
      <Box>
        <Typography variant="body2">
          {record.order.shippingAddress ?? '—'}
          {record.order.shippingCity ? `, ${record.order.shippingCity}` : ''}
        </Typography>
        {record.order.shippingPhone && (
          <Typography variant="body2" color="text.secondary">
            {record.order.shippingPhone}
          </Typography>
        )}
      </Box>
    );
  }
  if (record.pickupPoint) {
    return (
      <Box>
        <Typography variant="body2">
          {record.pickupPoint.name?.fr ?? record.pickupPoint.name?.en ?? '—'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {record.pickupPoint.address}, {record.pickupPoint.city}
        </Typography>
      </Box>
    );
  }
  return <Typography variant="body2">—</Typography>;
};

const Timestamps = () => {
  const record = useRecordContext<Delivery>();
  if (!record) return null;
  const fmt = (iso: string | null): string => (iso ? new Date(iso).toLocaleString('fr-FR') : '—');
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2">Assignée : {fmt(record.assignedAt)}</Typography>
      <Typography variant="body2">Prise en charge : {fmt(record.pickedUpAt)}</Typography>
      <Typography variant="body2">Livrée : {fmt(record.deliveredAt)}</Typography>
    </Stack>
  );
};

const Actions = () => {
  const record = useRecordContext<Delivery>();
  if (!record) return <TopToolbar />;
  return (
    <TopToolbar>
      <TransitionButton />
      <EditMetadataButton />
    </TopToolbar>
  );
};

export const DeliveryShow = () => (
  <Show actions={<Actions />}>
    <SimpleShowLayout>
      <Header />
      <Labeled label="resources.deliveries.fields.client">
        <Recipient />
      </Labeled>
      <Labeled label="resources.deliveries.fields.destination">
        <DestinationBlock />
      </Labeled>
      <Labeled label="resources.deliveries.fields.trackingNote">
        <FunctionField<Delivery>
          render={(record) => record.trackingNote ?? '—'}
        />
      </Labeled>
      <Labeled label="resources.deliveries.fields.actualCost">
        <FunctionField<Delivery> render={(record) => formatXAF(record.actualCost)} />
      </Labeled>
      <Labeled label="resources.deliveries.fields.timestamps">
        <Timestamps />
      </Labeled>
      <Labeled label="resources.deliveries.packaging.heading" fullWidth>
        <PackagingPanel />
      </Labeled>
      <TextField source="order.orderNumber" label="resources.deliveries.fields.orderNumber" />
      <DateField source="createdAt" showTime />
    </SimpleShowLayout>
  </Show>
);
