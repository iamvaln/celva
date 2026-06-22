import { useState } from 'react';
import {
  Button,
  Show,
  SimpleShowLayout,
  TopToolbar,
  useNotify,
  useRecordContext,
  useRefresh,
  useTranslate,
} from 'react-admin';
import {
  Box,
  Button as MuiButton,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField as MuiTextField,
  Typography,
} from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import type {
  StudioRequest,
  StudioRequestFabricSelection,
  StudioRequestStatus,
} from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

const ALLOWED_NEXT: Record<StudioRequestStatus, StudioRequestStatus[]> = {
  PENDING: ['CONTACTED', 'REJECTED'],
  CONTACTED: ['CONFIRMED', 'REJECTED'],
  CONFIRMED: ['COMPLETED', 'REJECTED'],
  COMPLETED: [],
  REJECTED: [],
};

const STATUS_COLOR: Record<StudioRequestStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  PENDING: 'warning',
  CONTACTED: 'info',
  CONFIRMED: 'info',
  COMPLETED: 'success',
  REJECTED: 'error',
};

const TransitionButton = () => {
  const record = useRecordContext<StudioRequest>();
  const notify = useNotify();
  const refresh = useRefresh();
  const t = useTranslate();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<StudioRequestStatus | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!record) return null;
  const choices = ALLOWED_NEXT[record.status] ?? [];
  if (choices.length === 0) return null;

  const submit = async () => {
    if (!next) return;
    try {
      setBusy(true);
      await fetchJson(`${API_BASE}/studio/requests/admin/${record.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ status: next, internalNote: note.trim() || undefined }),
      });
      notify('resources.studio-requests.notifications.transitioned', { type: 'success' });
      setOpen(false);
      setNext('');
      setNote('');
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
        label="resources.studio-requests.actions.transition"
        startIcon={<TimelineIcon />}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('resources.studio-requests.actions.transition')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              {t('resources.studio-requests.dialogs.current')}:{' '}
              <strong>{record.status}</strong>
            </Typography>
            <Select
              value={next}
              onChange={(e) => setNext(e.target.value as StudioRequestStatus)}
              displayEmpty
              fullWidth
              size="small"
            >
              <MenuItem value="" disabled>
                {t('resources.studio-requests.dialogs.pick_next')}
              </MenuItem>
              {choices.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
            <MuiTextField
              label={t('resources.studio-requests.dialogs.note')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              inputProps={{ maxLength: 2000 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>{t('ra.action.cancel')}</MuiButton>
          <MuiButton variant="contained" disabled={!next || busy} onClick={submit}>
            {t('ra.action.confirm')}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

const Actions = () => {
  const record = useRecordContext<StudioRequest>();
  if (!record) return <TopToolbar />;
  return (
    <TopToolbar>
      <TransitionButton />
    </TopToolbar>
  );
};

const Header = () => {
  const record = useRecordContext<StudioRequest>();
  if (!record) return null;
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
      <Typography variant="h6">{record.customerName}</Typography>
      <Chip label={record.status} size="small" color={STATUS_COLOR[record.status]} />
      <Typography variant="body2" color="text.secondary">
        {record.customerEmail ?? '—'} · {record.customerPhone}
      </Typography>
    </Stack>
  );
};

const Appointment = () => {
  const record = useRecordContext<StudioRequest>();
  if (!record) return null;
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2">
        <strong>Mode RDV :</strong> {record.appointmentMode ?? '—'}
      </Typography>
      <Typography variant="body2">
        <strong>Date :</strong>{' '}
        {record.appointmentDate
          ? new Date(record.appointmentDate).toLocaleDateString('fr-FR')
          : '—'}
      </Typography>
      <Typography variant="body2">
        <strong>Créneau :</strong> {record.appointmentSlot ?? '—'}
      </Typography>
      {record.customerCity && (
        <Typography variant="body2">
          <strong>Ville :</strong> {record.customerCity}
        </Typography>
      )}
    </Stack>
  );
};

// Group the picked fabrics by their parent family, so the stylist can see
// at a glance which families the customer is interested in.
const Selection = () => {
  const record = useRecordContext<StudioRequest>();
  if (!record) return null;
  const picks = record.selectedFabrics ?? [];
  if (picks.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucune sélection — RDV ouvert.
      </Typography>
    );
  }

  const grouped = new Map<string, { familyName: string; items: StudioRequestFabricSelection[] }>();
  for (const sel of picks) {
    const key = sel.fabric.family.id;
    const familyName = sel.fabric.family.name?.fr ?? sel.fabric.family.slug;
    const bucket = grouped.get(key) ?? { familyName, items: [] };
    bucket.items.push(sel);
    grouped.set(key, bucket);
  }

  return (
    <Stack spacing={2}>
      {Array.from(grouped.values()).map((bucket) => (
        <Box key={bucket.familyName}>
          <Typography variant="overline" color="text.secondary">
            {bucket.familyName}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {bucket.items.map((sel) => (
              <Stack
                key={sel.fabricId}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 0.5,
                  padding: '6px 10px',
                }}
              >
                {sel.fabric.swatchImage ? (
                  <Box
                    component="img"
                    src={sel.fabric.swatchImage}
                    alt=""
                    sx={{ width: 32, height: 32, objectFit: 'cover' }}
                  />
                ) : (
                  <Box sx={{ width: 32, height: 32, bgcolor: 'action.hover' }} />
                )}
                <Typography variant="body2">{sel.fabric.name?.fr ?? '—'}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
};

const Notes = () => {
  const record = useRecordContext<StudioRequest>();
  if (!record) return null;
  return (
    <Stack spacing={2}>
      {record.notes && (
        <Box>
          <Typography variant="overline" color="text.secondary">
            Notes cliente
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {record.notes}
          </Typography>
        </Box>
      )}
      {record.internalNotes && (
        <Box>
          <Typography variant="overline" color="text.secondary">
            Notes internes
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {record.internalNotes}
          </Typography>
        </Box>
      )}
    </Stack>
  );
};

export const StudioRequestShow = () => (
  <Show actions={<Actions />}>
    <SimpleShowLayout>
      <Header />
      <Appointment />
      <Selection />
      <Notes />
    </SimpleShowLayout>
  </Show>
);
