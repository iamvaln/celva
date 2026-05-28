import {
  Datagrid,
  DateField,
  FunctionField,
  List,
  ReferenceField,
  ReferenceInput,
  SelectInput,
  TextField,
  useTranslate,
} from 'react-admin';
import { Chip } from '@mui/material';
import type { ProductionOrder } from '../../types';

const STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
const TYPES = ['INTERNAL', 'SUBCONTRACTED'] as const;

const STATUS_COLOR: Record<
  ProductionOrder['status'],
  'default' | 'info' | 'success' | 'error'
> = {
  PLANNED: 'default',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const filters = [
  <SelectInput
    key="status"
    source="status"
    alwaysOn
    choices={STATUSES.map((s) => ({ id: s, name: s }))}
  />,
  <SelectInput key="type" source="type" choices={TYPES.map((t) => ({ id: t, name: t }))} />,
  <ReferenceInput key="productId" source="productId" reference="products">
    <SelectInput optionText="slug" />
  </ReferenceInput>,
];

export const ProductionOrderList = () => {
  const t = useTranslate();
  return (
    <List filters={filters} sort={{ field: 'createdAt', order: 'DESC' }} perPage={25}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <FunctionField<ProductionOrder>
          label={t('resources.production-orders.fields.status')}
          render={(record) => (
            <Chip
              label={record.status}
              size="small"
              color={STATUS_COLOR[record.status]}
              variant="outlined"
            />
          )}
        />
        <ReferenceField source="productId" reference="products" link={false}>
          <TextField source="slug" />
        </ReferenceField>
        <TextField source="type" />
        <TextField source="quantity" />
        <DateField source="createdAt" showTime />
      </Datagrid>
    </List>
  );
};
