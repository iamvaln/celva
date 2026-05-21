import {
  BooleanField,
  BooleanInput,
  Datagrid,
  DateField,
  FunctionField,
  List,
  NumberField,
  SearchInput,
  TextField,
} from 'react-admin';
import type { Collection } from '../../types';

const filters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <BooleanInput key="isActive" source="isActive" />,
];

export const CollectionList = () => (
  <List filters={filters} sort={{ field: 'sortOrder', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="slug" />
      <FunctionField
        label="resources.collections.fields.name"
        render={(record: Collection) =>
          `${record.name.fr ?? ''} / ${record.name.en ?? ''}`.replace(/^ \/ | \/ $/g, '')
        }
      />
      <NumberField source="sortOrder" />
      <BooleanField source="isActive" />
      <DateField source="createdAt" showTime />
    </Datagrid>
  </List>
);
