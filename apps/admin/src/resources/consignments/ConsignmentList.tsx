import {
  Datagrid,
  DateField,
  DateInput,
  FunctionField,
  List,
  ReferenceInput,
  SearchInput,
  SelectInput,
  TextField,
  useTranslate,
} from 'react-admin';
import { Chip } from '@mui/material';
import type { Consignment } from '../../types';

const STATUSES = ['ACTIVE', 'RECONCILED', 'CANCELLED'] as const;

const STATUS_COLOR: Record<
  Consignment['status'],
  'warning' | 'success' | 'default'
> = {
  ACTIVE: 'warning',
  RECONCILED: 'success',
  CANCELLED: 'default',
};

const filters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <SelectInput
    key="status"
    source="status"
    choices={STATUSES.map((s) => ({ id: s, name: s }))}
  />,
  <ReferenceInput key="salesRepId" source="salesRepId" reference="users">
    <SelectInput optionText="email" />
  </ReferenceInput>,
  <DateInput key="from" source="from" />,
  <DateInput key="to" source="to" />,
];

export const ConsignmentList = () => {
  const t = useTranslate();
  return (
    <List
      filters={filters}
      sort={{ field: 'releasedAt', order: 'DESC' }}
      perPage={25}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <FunctionField<Consignment>
          label={t('resources.consignments.fields.status')}
          render={(record) => (
            <Chip
              label={record.status}
              size="small"
              color={STATUS_COLOR[record.status]}
              variant="outlined"
            />
          )}
        />
        <FunctionField<Consignment>
          label={t('resources.consignments.fields.salesRep')}
          render={(record) => `${record.salesRep.name} — ${record.salesRep.email}`}
        />
        <FunctionField<Consignment>
          label={t('resources.consignments.fields.lines')}
          render={(record) =>
            record.items.length === 0
              ? '—'
              : `${record.items.length} ligne(s) · ${record.items.reduce(
                  (n, it) => n + it.quantityTaken,
                  0,
                )} unités`
          }
        />
        <TextField source="notes" emptyText="—" />
        <DateField source="releasedAt" showTime />
        <DateField source="reconciledAt" showTime emptyText="—" />
      </Datagrid>
    </List>
  );
};
