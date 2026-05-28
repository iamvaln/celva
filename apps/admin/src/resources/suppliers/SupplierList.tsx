import {
  Datagrid,
  EmailField,
  List,
  SearchInput,
  TextField,
} from 'react-admin';

const filters = [<SearchInput key="search" source="search" alwaysOn />];

export const SupplierList = () => (
  <List filters={filters} sort={{ field: 'name', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="name" />
      <TextField source="contact" emptyText="—" />
      <TextField source="phone" emptyText="—" />
      <EmailField source="email" emptyText="—" />
      <TextField source="address" emptyText="—" />
    </Datagrid>
  </List>
);
