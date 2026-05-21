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

const filters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <ReferenceInput key="productId" source="productId" reference="products" perPage={50}>
    <SelectInput optionText={(p: { name?: { fr?: string } }) => p.name?.fr ?? ''} />
  </ReferenceInput>,
  <BooleanInput key="isActive" source="isActive" />,
];

export const VariantList = () => (
  <List filters={filters} sort={{ field: 'createdAt', order: 'DESC' }} perPage={50}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="sku" />
      <ReferenceField source="productId" reference="products" link="edit">
        <FunctionField render={(p: { name?: { fr?: string } }) => p.name?.fr ?? ''} />
      </ReferenceField>
      <NumberField source="stock" />
      <NumberField source="consignedStock" label="resources.variants.fields.consigned" />
      <NumberField source="priceOverride" options={{ style: 'currency', currency: 'XAF' }} />
      <BooleanField source="isActive" />
      <DateField source="createdAt" showTime />
    </Datagrid>
  </List>
);
