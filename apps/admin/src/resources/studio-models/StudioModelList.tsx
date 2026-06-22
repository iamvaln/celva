import {
  BooleanField,
  Datagrid,
  FunctionField,
  List,
  NumberField,
  ReferenceField,
  ReferenceInput,
  SelectInput,
} from 'react-admin';
import { Box } from '@mui/material';
import type { StudioModel } from '../../types';

const filters = [
  <ReferenceInput
    key="garmentId"
    source="garmentId"
    reference="studio-garments"
    alwaysOn
  >
    <SelectInput
      optionText={(record) => record?.name?.fr ?? '—'}
      label="resources.studio-models.fields.garment"
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

const Thumb = ({ src }: { src: string | null }) =>
  src ? (
    <Box
      component="img"
      src={src}
      alt=""
      sx={{ width: 56, height: 72, objectFit: 'cover', borderRadius: 0 }}
    />
  ) : (
    <Box sx={{ width: 56, height: 72, bgcolor: 'action.hover' }} />
  );

export const StudioModelList = () => (
  <List filters={filters} sort={{ field: 'sortOrder', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <FunctionField<StudioModel>
        label=""
        render={(record) => <Thumb src={record.imageKey} />}
      />
      <ReferenceField source="garmentId" reference="studio-garments" link={false}>
        <FunctionField render={(record) => record?.name?.fr ?? '—'} />
      </ReferenceField>
      <FunctionField<StudioModel>
        source="caption"
        render={(record) => record.caption?.fr ?? '—'}
      />
      <FunctionField<StudioModel>
        source="angle"
        render={(record) => record.angle ?? '—'}
      />
      <NumberField source="sortOrder" />
      <BooleanField source="isActive" />
    </Datagrid>
  </List>
);
