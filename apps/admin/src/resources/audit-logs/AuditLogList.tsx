import {
  Datagrid,
  DateField,
  FunctionField,
  List,
  SearchInput,
  TextField,
  useTranslate,
} from 'react-admin';
import { Chip } from '@mui/material';
import type { AuditLog } from '../../types';

const filters = [
  <SearchInput key="action" source="action" alwaysOn placeholder="Action" />,
  <SearchInput key="entity" source="entity" placeholder="Entité" />,
];

export const AuditLogList = () => {
  const t = useTranslate();
  return (
    <List
      filters={filters}
      perPage={50}
      sort={{ field: 'createdAt', order: 'DESC' }}
      exporter={false}
    >
      <Datagrid rowClick={false} bulkActionButtons={false}>
        <DateField source="createdAt" showTime />
        <FunctionField<AuditLog>
          label={t('resources.audit-logs.fields.user')}
          render={(record) =>
            record.user ? `${record.user.name} · ${record.user.email}` : record.userId
          }
        />
        <FunctionField<AuditLog>
          label={t('resources.audit-logs.fields.action')}
          render={(record) => (
            <Chip label={record.action} size="small" variant="outlined" />
          )}
        />
        <TextField source="entity" />
        <TextField source="entityId" />
        <TextField source="appSource" />
      </Datagrid>
    </List>
  );
};
