import {
  BooleanField,
  Datagrid,
  DateField,
  EmailField,
  FunctionField,
  List,
  SearchInput,
  SelectInput,
  TextField,
} from 'react-admin';
import { Chip } from '@mui/material';
import { USER_ROLE, type UserRole } from '@celva/shared';
import type { AdminUser } from '../../types';

const userFilters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <SelectInput
    key="role"
    source="role"
    choices={Object.values(USER_ROLE).map((role) => ({ id: role, name: role }))}
  />,
  <SelectInput
    key="isActive"
    source="isActive"
    choices={[
      { id: 'true', name: 'Actif / Active' },
      { id: 'false', name: 'Désactivé / Inactive' },
    ]}
  />,
];

// Elevated roles need to be scannable at a glance for access-audit reviews.
const ROLE_COLOR: Record<UserRole, 'default' | 'primary' | 'secondary' | 'info' | 'error'> = {
  ADMIN: 'error',
  MANAGER: 'primary',
  SALES_REP: 'secondary',
  DELIVERER: 'info',
  CLIENT: 'default',
};

export const UserList = () => (
  <List filters={userFilters} sort={{ field: 'createdAt', order: 'DESC' }} perPage={20}>
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="name" />
      <EmailField source="email" />
      <FunctionField<AdminUser>
        source="role"
        render={(record) => (
          <Chip label={record.role} color={ROLE_COLOR[record.role]} size="small" />
        )}
      />
      <BooleanField source="isActive" />
      <TextField source="phone" />
      <DateField source="createdAt" showTime />
    </Datagrid>
  </List>
);
