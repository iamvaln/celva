import { useState } from 'react';
import {
  Button,
  Datagrid,
  DateField,
  DateInput,
  FunctionField,
  List,
  SearchInput,
  SelectInput,
  useListContext,
  useNotify,
  useRefresh,
  useTranslate,
  useUnselectAll,
} from 'react-admin';
import { Chip, Stack } from '@mui/material';
import PaidIcon from '@mui/icons-material/Paid';
import type { SalesCommission } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

const STATUSES = ['PENDING', 'PAID'] as const;

const filters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <SelectInput
    key="status"
    source="status"
    choices={STATUSES.map((s) => ({ id: s, name: s }))}
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
 * Bulk "Mark paid" action — only renders when at least one row is
 * selected. Always-on companion to the default BulkDelete (which we
 * suppress in favor of this single action because deleting commissions
 * outside of cancellation would diverge from the order ledger).
 */
const BulkMarkPaidButton = () => {
  const t = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const { selectedIds } = useListContext();
  const unselectAll = useUnselectAll('sales-commissions');
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBusy(true);
      const { body } = await fetchJson<{ paid: number; totalAmount: string }>(
        `${API_BASE}/sales-commissions/mark-paid`,
        { method: 'POST', body: JSON.stringify({ ids: selectedIds }) },
      );
      notify(
        t('resources.sales-commissions.notifications.paid', {
          n: body.paid,
          total: formatXAF(body.totalAmount),
        }),
        { type: 'success' },
      );
      unselectAll();
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
      label="resources.sales-commissions.actions.mark_paid"
      startIcon={<PaidIcon />}
      onClick={handle}
      disabled={busy}
    />
  );
};

const BulkActions = () => (
  <Stack direction="row" spacing={1}>
    <BulkMarkPaidButton />
  </Stack>
);

export const SalesCommissionList = () => {
  const t = useTranslate();
  return (
    <List
      filters={filters}
      sort={{ field: 'createdAt', order: 'DESC' }}
      perPage={25}
    >
      <Datagrid rowClick={false} bulkActionButtons={<BulkActions />}>
        <FunctionField<SalesCommission>
          label={t('resources.sales-commissions.fields.orderNumber')}
          render={(record) => record.order.orderNumber}
        />
        <FunctionField<SalesCommission>
          label={t('resources.sales-commissions.fields.salesRep')}
          render={(record) => `${record.salesRep.name} — ${record.salesRep.email}`}
        />
        <FunctionField<SalesCommission>
          label={t('resources.sales-commissions.fields.product')}
          render={(record) =>
            `${record.orderItem.variant.product.name?.fr ?? '—'} × ${record.orderItem.quantity}`
          }
        />
        <FunctionField<SalesCommission>
          label={t('resources.sales-commissions.fields.amount')}
          render={(record) => formatXAF(record.amount)}
        />
        <FunctionField<SalesCommission>
          label={t('resources.sales-commissions.fields.status')}
          render={(record) => (
            <Chip
              label={record.status}
              size="small"
              color={record.status === 'PAID' ? 'success' : 'warning'}
              variant="outlined"
            />
          )}
        />
        <DateField source="paidAt" showTime emptyText="—" />
      </Datagrid>
    </List>
  );
};

