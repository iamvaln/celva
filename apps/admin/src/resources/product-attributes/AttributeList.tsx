import {
  Datagrid,
  FunctionField,
  List,
  NumberField,
  ReferenceField,
  ReferenceInput,
  SelectInput,
} from 'react-admin';
import type { ProductAttribute } from '../../types';

const filters = [
  <ReferenceInput key="productId" source="productId" reference="products" perPage={50} alwaysOn>
    <SelectInput optionText={(p: { name?: { fr?: string } }) => p.name?.fr ?? ''} />
  </ReferenceInput>,
];

export const AttributeList = () => (
  <List filters={filters} sort={{ field: 'sortOrder', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <ReferenceField source="productId" reference="products" link="edit">
        <FunctionField render={(p: { name?: { fr?: string } }) => p.name?.fr ?? ''} />
      </ReferenceField>
      <FunctionField
        label="resources.attributes.fields.name"
        render={(record: ProductAttribute) =>
          `${record.name.fr ?? ''} / ${record.name.en ?? ''}`.replace(/^ \/ | \/ $/g, '')
        }
      />
      <NumberField source="sortOrder" />
    </Datagrid>
  </List>
);
