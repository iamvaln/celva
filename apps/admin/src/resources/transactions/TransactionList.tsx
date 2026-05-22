import {
  ChipField,
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
import type { Transaction } from '../../types';

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

export const TransactionList = () => {
  const translate = useTranslate();
  return (
    <List filters={filters} sort={{ field: 'date', order: 'DESC' }} perPage={25}>
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
