import {
  DateField,
  DateInput,
  Datagrid,
  FunctionField,
  List,
  SearchInput,
  SelectInput,
  TextField,
  useTranslate,
} from 'react-admin';
import { Chip } from '@mui/material';
import { ORDER_CHANNEL, ORDER_STATUS } from '@celva/shared';
import type { AdminOrderRow } from '../../types';
import { ORDER_STATUS_COLOR, PAYMENT_STATUS_COLOR } from './statusColors';

const orderFilters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <SelectInput
    key="status"
    source="status"
    choices={Object.values(ORDER_STATUS).map((s) => ({ id: s, name: s }))}
  />,
  <SelectInput
    key="channel"
    source="channel"
    choices={Object.values(ORDER_CHANNEL).map((c) => ({ id: c, name: c }))}
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

export const OrderList = () => {
  const translate = useTranslate();
  return (
    <List
      filters={orderFilters}
      sort={{ field: 'createdAt', order: 'DESC' }}
      perPage={25}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="orderNumber" />
        <FunctionField<AdminOrderRow>
          label={translate('resources.orders.fields.client')}
          render={(record) => `${record.user.name} — ${record.user.email}`}
        />
        <FunctionField<AdminOrderRow>
          label={translate('resources.orders.fields.status')}
          render={(record) => (
            <Chip
              label={record.status}
              size="small"
              color={ORDER_STATUS_COLOR[record.status]}
              variant="outlined"
            />
          )}
        />
        <TextField source="channel" />
        <FunctionField<AdminOrderRow>
          label={translate('resources.orders.fields.total')}
          render={(record) => formatXAF(record.total)}
        />
        <FunctionField<AdminOrderRow>
          label={translate('resources.orders.fields.payment')}
          render={(record) =>
            record.payment ? (
              <Chip
                label={`${record.payment.method} · ${record.payment.status}`}
                size="small"
                color={PAYMENT_STATUS_COLOR[record.payment.status]}
                variant="outlined"
              />
            ) : (
              '—'
            )
          }
        />
        <FunctionField<AdminOrderRow>
          label={translate('resources.orders.fields.items')}
          render={(record) => `${record.items.length}`}
        />
        <DateField source="createdAt" showTime />
      </Datagrid>
    </List>
  );
};
