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
import { DELIVERY_MODE, DELIVERY_STATUS } from '@celva/shared';
import type { Delivery } from '../../types';
import { DELIVERY_STATUS_COLOR } from './statusColors';

const filters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <SelectInput
    key="status"
    source="status"
    choices={Object.values(DELIVERY_STATUS).map((s) => ({ id: s, name: s }))}
  />,
  <SelectInput
    key="mode"
    source="mode"
    choices={Object.values(DELIVERY_MODE).map((m) => ({ id: m, name: m }))}
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

export const DeliveryList = () => {
  const translate = useTranslate();
  return (
    <List
      filters={filters}
      sort={{ field: 'createdAt', order: 'DESC' }}
      perPage={25}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <FunctionField<Delivery>
          label={translate('resources.deliveries.fields.orderNumber')}
          render={(record) => record.order.orderNumber}
        />
        <FunctionField<Delivery>
          label={translate('resources.deliveries.fields.client')}
          render={(record) => `${record.order.user.name} — ${record.order.user.email}`}
        />
        <FunctionField<Delivery>
          label={translate('resources.deliveries.fields.status')}
          render={(record) => (
            <Chip
              label={record.status}
              size="small"
              color={DELIVERY_STATUS_COLOR[record.status]}
              variant="outlined"
            />
          )}
        />
        <TextField source="mode" />
        <FunctionField<Delivery>
          label={translate('resources.deliveries.fields.total')}
          render={(record) => formatXAF(record.order.total)}
        />
        <FunctionField<Delivery>
          label={translate('resources.deliveries.fields.actualCost')}
          render={(record) => formatXAF(record.actualCost)}
        />
        <DateField source="createdAt" showTime />
      </Datagrid>
    </List>
  );
};
