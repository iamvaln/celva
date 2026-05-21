import {
  BooleanField,
  BooleanInput,
  ChipField,
  Datagrid,
  DateField,
  List,
  NumberField,
  SearchInput,
  SelectInput,
  TextField,
} from 'react-admin';
import { PROMO_CODE_TYPE } from '@celva/shared';

const filters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <SelectInput
    key="type"
    source="type"
    choices={Object.values(PROMO_CODE_TYPE).map((t) => ({ id: t, name: t }))}
  />,
  <BooleanInput key="isActive" source="isActive" />,
];

export const PromoCodeList = () => (
  <List filters={filters} sort={{ field: 'createdAt', order: 'DESC' }} perPage={50}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="code" />
      <ChipField source="type" />
      <NumberField source="value" />
      <NumberField source="usedCount" />
      <NumberField source="maxUses" />
      <BooleanField source="isActive" />
      <DateField source="expiresAt" />
    </Datagrid>
  </List>
);
