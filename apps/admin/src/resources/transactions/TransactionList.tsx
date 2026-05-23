import { useState } from 'react';
import {
  ChipField,
  CreateButton,
  DateField,
  DateInput,
  Datagrid,
  FunctionField,
  List,
  SearchInput,
  SelectInput,
  TextField,
  TopToolbar,
  useListContext,
  useNotify,
  useTranslate,
} from 'react-admin';
import { Button, Chip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import type { Transaction } from '../../types';
import { API_BASE, STORAGE_KEYS } from '../../config';

const TYPES = ['INCOME', 'EXPENSE'] as const;
const CATEGORIES = [
  'SALE',
  'RAW_MATERIALS',
  'SUBCONTRACTING',
  'MARKETING',
  'TRANSPORT',
  'CUSTOMS',
  'SALARY',
  'RENT',
  'EQUIPMENT',
  'PACKAGING',
  'DELIVERY',
  'COMMISSION',
  'OTHER',
] as const;

const filters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <SelectInput
    key="type"
    source="type"
    choices={TYPES.map((t) => ({ id: t, name: t }))}
  />,
  <SelectInput
    key="category"
    source="category"
    choices={CATEGORIES.map((c) => ({ id: c, name: c }))}
  />,
  <DateInput key="from" source="from" />,
  <DateInput key="to" source="to" />,
];

const formatXAF = (value: string | number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));

/**
 * Server-side CSV export — calls /transactions/export.csv with the
 * current list's filter window (from/to) so accountants get exactly
 * what they're seeing in the UI. Browser triggers a download via an
 * object URL.
 */
const ExportCsvButton = () => {
  const t = useTranslate();
  const notify = useNotify();
  const { filterValues } = useListContext();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    try {
      setBusy(true);
      const params = new URLSearchParams();
      if (filterValues?.from) params.set('from', String(filterValues.from));
      if (filterValues?.to) params.set('to', String(filterValues.to));
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(STORAGE_KEYS.accessToken)
          : null;
      const res = await fetch(
        `${API_BASE}/transactions/export.csv${params.toString() ? `?${params}` : ''}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: 'include',
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `celva-transactions-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notify('resources.transactions.notifications.exported', { type: 'success' });
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
      onClick={download}
      disabled={busy}
      startIcon={<DownloadIcon />}
      size="small"
      sx={{ textTransform: 'uppercase', fontSize: 13 }}
    >
      {t('resources.transactions.actions.export_csv')}
    </Button>
  );
};

const ListActions = () => (
  <TopToolbar>
    <CreateButton />
    <ExportCsvButton />
  </TopToolbar>
);

export const TransactionList = () => {
  const translate = useTranslate();
  return (
    <List
      filters={filters}
      actions={<ListActions />}
      sort={{ field: 'date', order: 'DESC' }}
      perPage={25}
    >
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <DateField source="date" />
        <FunctionField<Transaction>
          label={translate('resources.transactions.fields.type')}
          render={(record) => (
            <Chip
              label={record.type}
              size="small"
              color={record.type === 'INCOME' ? 'success' : 'warning'}
              variant="outlined"
            />
          )}
        />
        <ChipField source="category" size="small" />
        <FunctionField<Transaction>
          label={translate('resources.transactions.fields.amount')}
          render={(record) => formatXAF(record.amount)}
        />
        <TextField source="description" />
        <FunctionField<Transaction>
          label={translate('resources.transactions.fields.source')}
          render={(record) =>
            record.orderId
              ? translate('resources.transactions.source.order', {
                  number: record.order?.orderNumber ?? '—',
                })
              : translate('resources.transactions.source.manual')
          }
        />
      </Datagrid>
    </List>
  );
};
