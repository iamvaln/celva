import {
  BooleanField,
  BooleanInput,
  Datagrid,
  DateField,
  FunctionField,
  List,
  NumberField,
  ReferenceField,
  ReferenceInput,
  SearchInput,
  SelectInput,
  TextField,
} from 'react-admin';
import { PRODUCTION_TYPE } from '@celva/shared';
import type { Product } from '../../types';

const filters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <ReferenceInput key="categoryId" source="categoryId" reference="categories" perPage={100}>
    <SelectInput optionText={(c: { name?: { fr?: string } }) => c.name?.fr ?? ''} />
  </ReferenceInput>,
  <SelectInput
    key="productionType"
    source="productionType"
    choices={Object.values(PRODUCTION_TYPE).map((t) => ({ id: t, name: t }))}
  />,
  <BooleanInput key="isActive" source="isActive" />,
];

export const ProductList = () => (
  <List filters={filters} sort={{ field: 'createdAt', order: 'DESC' }} perPage={20}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <FunctionField
        label="resources.products.fields.name"
        render={(record: Product) =>
          `${record.name.fr ?? ''} / ${record.name.en ?? ''}`.replace(/^ \/ | \/ $/g, '')
        }
      />
      <TextField source="slug" />
      <ReferenceField source="categoryId" reference="categories" link={false}>
        <FunctionField render={(c: { name?: { fr?: string } }) => c.name?.fr ?? ''} />
      </ReferenceField>
      <NumberField source="displayPrice" options={{ style: 'currency', currency: 'XAF' }} />
      <TextField source="productionType" />
      <BooleanField source="isActive" />
      <DateField source="createdAt" showTime />
    </Datagrid>
  </List>
);
