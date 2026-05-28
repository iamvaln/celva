import { useState } from 'react';
import {
  Button,
  DateField,
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
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DoneIcon from '@mui/icons-material/Done';
import CancelIcon from '@mui/icons-material/Cancel';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { ProductionOrder } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

const STATUS_COLOR: Record<
  ProductionOrder['status'],
  'default' | 'info' | 'success' | 'error'
> = {
  PLANNED: 'default',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const formatXAF = (v: string | number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(v));

const useAction = () => {
  const t = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const run = async (url: string, successKey: string) => {
    try {
      setBusy(true);
      await fetchJson(url, { method: 'POST' });
      notify(successKey, { type: 'success' });
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
};

const Actions = () => {
  const record = useRecordContext<ProductionOrder>();
  const t = useTranslate();
  const { busy, run } = useAction();
  if (!record) return <TopToolbar />;
  return (
    <TopToolbar>
      {record.status === 'PLANNED' && (
        <Button
          label="resources.production-orders.actions.start"
          startIcon={<PlayArrowIcon />}
          disabled={busy}
          onClick={() =>
            run(`${API_BASE}/production-orders/${record.id}/start`, 'resources.production-orders.notifications.started')
          }
        />
      )}
      {record.status === 'IN_PROGRESS' && (
        <Button
          label="resources.production-orders.actions.complete"
          startIcon={<DoneIcon />}
          disabled={busy}
          onClick={() =>
            run(`${API_BASE}/production-orders/${record.id}/complete`, 'resources.production-orders.notifications.completed')
          }
        />
      )}
      {(record.status === 'PLANNED' || record.status === 'IN_PROGRESS') && (
        <Button
          label="resources.production-orders.actions.cancel"
          startIcon={<CancelIcon />}
          disabled={busy}
          sx={{ color: 'error.main' }}
          onClick={() => {
            if (!window.confirm(t('resources.production-orders.dialogs.cancel_confirm'))) return;
            void run(`${API_BASE}/production-orders/${record.id}/cancel`, 'resources.production-orders.notifications.cancelled');
          }}
        />
      )}
    </TopToolbar>
  );
};

const Header = () => {
  const record = useRecordContext<ProductionOrder>();
  if (!record) return null;
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
      <Typography variant="h6">{record.product?.name?.fr ?? record.product?.slug ?? '—'}</Typography>
      <Chip label={record.status} color={STATUS_COLOR[record.status]} size="small" variant="outlined" />
      <Chip label={record.type} size="small" variant="outlined" />
      <Typography variant="body2">×{record.quantity}</Typography>
    </Stack>
  );
};

const Consumptions = () => {
  const record = useRecordContext<ProductionOrder>();
  if (!record) return null;
  return (
    <Box sx={{ mt: 1 }}>
      {record.materialConsumptions.map((c) => (
        <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
          <Typography variant="body2">{c.rawMaterial.name}</Typography>
          <Typography variant="body2">
            {Number(c.quantityUsed)} {c.rawMaterial.unit} × {formatXAF(c.rawMaterial.unitPrice)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const Stages = () => {
  const record = useRecordContext<ProductionOrder>();
  if (!record || record.stages.length === 0) return null;
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {record.stages.map((s) => (
        <Chip
          key={s.id}
          label={s.name}
          size="small"
          color={s.status === 'COMPLETED' ? 'success' : 'default'}
          variant="outlined"
        />
      ))}
    </Stack>
  );
};

const Costs = () => {
  const record = useRecordContext<ProductionOrder>();
  if (!record) return null;
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2">Main d'œuvre : {formatXAF(record.laborCost)}</Typography>
      <Typography variant="body2">Sous-traitance : {formatXAF(record.subcontractCost)}</Typography>
      {record.product && (
        <Typography variant="body2">
          Coût de revient actuel : {formatXAF(record.product.costPrice)} / unité
        </Typography>
      )}
    </Stack>
  );
};

export const ProductionOrderShow = () => (
  <Show actions={<Actions />}>
    <SimpleShowLayout>
      <Header />
      <Labeled label="resources.production-orders.fields.consumptions">
        <Consumptions />
      </Labeled>
      <Labeled label="resources.production-orders.fields.stages">
        <Stages />
      </Labeled>
      <Labeled label="resources.production-orders.fields.costs">
        <Costs />
      </Labeled>
      <TextField source="notes" emptyText="—" />
      <DateField source="startDate" showTime emptyText="—" />
      <DateField source="endDate" showTime emptyText="—" />
      <DateField source="createdAt" showTime />
    </SimpleShowLayout>
  </Show>
);
