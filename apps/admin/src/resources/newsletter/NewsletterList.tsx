import { useState } from 'react';
import {
  BooleanField,
  Button,
  Datagrid,
  DateField,
  EmailField,
  List,
  SearchInput,
  SelectInput,
  TextField,
  useNotify,
  useRecordContext,
  useRefresh,
  useTranslate,
} from 'react-admin';
import UnsubscribeIcon from '@mui/icons-material/Unsubscribe';
import type { NewsletterSubscriber } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

const filters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <SelectInput
    key="isActive"
    source="isActive"
    choices={[
      { id: 'true', name: 'Actif / Active' },
      { id: 'false', name: 'Désinscrit / Unsubscribed' },
    ]}
  />,
];

const UnsubscribeButton = () => {
  const record = useRecordContext<NewsletterSubscriber>();
  const t = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  if (!record || !record.isActive) return null;

  const handle = async () => {
    try {
      setBusy(true);
      await fetchJson(`${API_BASE}/newsletter/admin/${record.id}/unsubscribe`, {
        method: 'POST',
      });
      notify('resources.newsletter.notifications.unsubscribed', { type: 'success' });
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
      label="resources.newsletter.actions.unsubscribe"
      startIcon={<UnsubscribeIcon />}
      onClick={handle}
      disabled={busy}
      sx={{ color: 'error.main' }}
    />
  );
};

export const NewsletterList = () => (
  <List filters={filters} sort={{ field: 'subscribedAt', order: 'DESC' }} perPage={50}>
    <Datagrid rowClick={false}>
      <EmailField source="email" />
      <TextField source="name" emptyText="—" />
      <BooleanField source="isActive" />
      <DateField source="subscribedAt" showTime />
      <DateField source="unsubscribedAt" showTime emptyText="—" />
      <UnsubscribeButton />
    </Datagrid>
  </List>
);
