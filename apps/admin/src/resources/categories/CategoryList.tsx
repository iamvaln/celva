import {
  Datagrid,
  DateField,
  FunctionField,
  List,
  NumberField,
  SearchInput,
  TextField,
} from 'react-admin';
import type { Category } from '../../types';

const filters = [<SearchInput key="search" source="search" alwaysOn />];

export const CategoryList = () => (
  <List filters={filters} sort={{ field: 'sortOrder', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="slug" />
      <FunctionField
        label="resources.categories.fields.name"
        render={(record: Category) =>
          `${record.name.fr ?? ''} / ${record.name.en ?? ''}`.replace(/^ \/ | \/ $/g, '')
        }
      />
      <NumberField source="sortOrder" />
      <DateField source="createdAt" showTime />
    </Datagrid>
  </List>
);
