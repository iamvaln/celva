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

// Mirror the OrderShow / UserList contrast pattern — destructive actions
// pop in red, state changes in info/warning, creates in success.
const ACTION_COLOR = (action: string): 'default' | 'success' | 'info' | 'warning' | 'error' => {
  if (action === 'CREATE') return 'success';
  if (action === 'UPDATE') return 'info';
  if (action === 'DELETE') return 'error';
  if (action === 'STATUS_CHANGE') return 'warning';
  return 'default';
};

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
            <Chip
              label={record.action}
              size="small"
              color={ACTION_COLOR(record.action)}
              variant="outlined"
            />
          )}
        />
        <TextField source="entity" />
        <TextField source="entityId" />
        <TextField source="appSource" />
      </Datagrid>
    </List>
  );
};
