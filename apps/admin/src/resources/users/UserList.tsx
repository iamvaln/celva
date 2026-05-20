import {
  BooleanField,
  ChipField,
  Datagrid,
  DateField,
  EmailField,
  List,
  SearchInput,
  SelectInput,
  TextField,
} from 'react-admin';
import { USER_ROLE } from '@celva/shared';

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

export const UserList = () => (
  <List filters={userFilters} sort={{ field: 'createdAt', order: 'DESC' }} perPage={20}>
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="name" />
      <EmailField source="email" />
      <ChipField source="role" />
      <BooleanField source="isActive" />
      <TextField source="phone" />
      <DateField source="createdAt" showTime />
    </Datagrid>
  </List>
);
