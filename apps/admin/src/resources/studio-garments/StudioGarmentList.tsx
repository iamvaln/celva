import {
  BooleanField,
  Datagrid,
  FunctionField,
  List,
  NumberField,
  ReferenceField,
  ReferenceInput,
  SearchInput,
  SelectInput,
} from 'react-admin';
import type { StudioGarment } from '../../types';

const filters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <ReferenceInput
    key="familyId"
    source="familyId"
    reference="studio-families"
    alwaysOn
  >
    <SelectInput
      optionText={(record) => record?.name?.fr ?? record?.slug ?? '—'}
      label="resources.studio-garments.fields.family"
    />
  </ReferenceInput>,
  <SelectInput
    key="isActive"
    source="isActive"
    choices={[
      { id: 'true', name: 'Actif' },
      { id: 'false', name: 'Inactif' },
    ]}
  />,
];

export const StudioGarmentList = () => (
  <List filters={filters} sort={{ field: 'sortOrder', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <FunctionField<StudioGarment>
        source="name"
        render={(record) => record.name?.fr ?? '—'}
      />
      <ReferenceField source="familyId" reference="studio-families" link={false}>
        <FunctionField render={(record) => record?.name?.fr ?? record?.slug ?? '—'} />
      </ReferenceField>
      <FunctionField<StudioGarment>
        label="resources.studio-garments.fields.photos_count"
        render={(record) => record.photos?.length ?? 0}
      />
      <NumberField source="sortOrder" />
      <BooleanField source="isActive" />
    </Datagrid>
  </List>
);
