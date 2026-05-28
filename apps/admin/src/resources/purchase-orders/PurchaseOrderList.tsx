import {
  Datagrid,
  DateField,
  DateInput,
  FunctionField,
  List,
  NumberField,
  ReferenceField,
  ReferenceInput,
  SelectInput,
  TextField,
  useTranslate,
} from 'react-admin';
import { Chip } from '@mui/material';
import type { PurchaseOrder } from '../../types';

const STATUSES = ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] as const;

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

const filters = [
  <SelectInput
    key="status"
    source="status"
    alwaysOn
    choices={STATUSES.map((s) => ({ id: s, name: s }))}
  />,
  <ReferenceInput key="supplierId" source="supplierId" reference="suppliers">
    <SelectInput optionText="name" />
  </ReferenceInput>,
  <DateInput key="from" source="from" />,
  <DateInput key="to" source="to" />,
];

export const PurchaseOrderList = () => {
  const t = useTranslate();
  return (
    <List filters={filters} sort={{ field: 'createdAt', order: 'DESC' }} perPage={25}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <FunctionField<PurchaseOrder>
          label={t('resources.purchase-orders.fields.status')}
          render={(record) => (
            <Chip
              label={record.status}
              size="small"
              color={STATUS_COLOR[record.status]}
              variant="outlined"
            />
          )}
        />
        <ReferenceField source="supplierId" reference="suppliers" link={false}>
          <TextField source="name" />
        </ReferenceField>
        <FunctionField<PurchaseOrder>
          label={t('resources.purchase-orders.fields.lines')}
          render={(record) => `${record.items.length}`}
        />
        <NumberField
          source="totalAmount"
          options={{ style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }}
        />
        <DateField source="createdAt" showTime />
      </Datagrid>
    </List>
  );
};
