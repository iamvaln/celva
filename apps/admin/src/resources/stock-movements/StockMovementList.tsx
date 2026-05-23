import {
  Datagrid,
  DateField,
  DateInput,
  FunctionField,
  List,
  SearchInput,
  SelectInput,
  TextField,
  useTranslate,
} from 'react-admin';
import { Chip } from '@mui/material';
import { STOCK_MOVEMENT_TYPE } from '@celva/shared';
import type { StockMovement } from '../../types';

const TYPES = Object.values(STOCK_MOVEMENT_TYPE) as Array<StockMovement['type']>;

const TYPE_COLOR: Record<
  StockMovement['type'],
  'success' | 'warning' | 'info' | 'error' | 'default'
> = {
  PRODUCTION_IN: 'success',
  PURCHASE_IN: 'success',
  CANCELLATION_RETURN: 'success',
  CONSIGNMENT_RETURN: 'success',
  SALE_OUT: 'warning',
  CONSIGNMENT_OUT: 'warning',
  MANUAL_ADJUSTMENT: 'info',
};

const filters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <SelectInput
    key="type"
    source="type"
    choices={TYPES.map((t) => ({ id: t, name: t }))}
  />,
  <DateInput key="from" source="from" />,
  <DateInput key="to" source="to" />,
];

/**
 * Read-only audit trail. No create/edit — all writes go through the
 * StockMovementsService.apply() boundary, which is the only place
 * allowed to mutate variant.stock per the spec's stock contract.
 */
export const StockMovementList = () => {
  const t = useTranslate();
  return (
    <List
      filters={filters}
      sort={{ field: 'createdAt', order: 'DESC' }}
      perPage={25}
    >
      <Datagrid rowClick={false} bulkActionButtons={false}>
        <DateField source="createdAt" showTime />
        <FunctionField<StockMovement>
          label={t('resources.stock-movements.fields.type')}
          render={(record) => (
            <Chip
              label={record.type}
              size="small"
              color={TYPE_COLOR[record.type] ?? 'default'}
              variant="outlined"
            />
          )}
        />
        <FunctionField<StockMovement>
          label={t('resources.stock-movements.fields.product')}
          render={(record) =>
            `${record.variant.product.name?.fr ?? '—'} — ${record.variant.sku}`
          }
        />
        <FunctionField<StockMovement>
          label={t('resources.stock-movements.fields.quantity')}
          render={(record) => (
            <span
              style={{
                color: record.quantity > 0 ? '#3b8131' : '#B26248',
                fontWeight: 500,
              }}
            >
              {record.quantity > 0 ? '+' : ''}
              {record.quantity}
            </span>
          )}
        />
        <TextField source="reason" emptyText="—" />
        <FunctionField<StockMovement>
          label={t('resources.stock-movements.fields.actor')}
          render={(record) => record.createdBy?.email ?? '—'}
        />
      </Datagrid>
    </List>
  );
};
