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
import type { StudioFabric } from '../../types';

const filters = [
  <ReferenceInput
    key="modelId"
    source="modelId"
    reference="studio-models"
    alwaysOn
  >
    <SelectInput
      optionText={(record) => record?.name?.fr ?? record?.slug ?? '—'}
      label="resources.studio-fabrics.fields.model"
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

const Thumb = ({ src, square }: { src: string | null; square?: boolean }) =>
  src ? (
    <Box
      component="img"
      src={src}
      alt=""
      sx={{
        width: square ? 48 : 48,
        height: square ? 48 : 64,
        objectFit: 'cover',
      }}
    />
  ) : (
    <Box sx={{ width: 48, height: square ? 48 : 64, bgcolor: 'action.hover' }} />
  );

export const StudioFabricList = () => (
  <List filters={filters} sort={{ field: 'sortOrder', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <FunctionField<StudioFabric>
        label="Swatch"
        render={(record) => <Thumb src={record.swatchImage} square />}
      />
      <FunctionField<StudioFabric>
        label="Photo"
        render={(record) => <Thumb src={record.photoImage} />}
      />
      <FunctionField<StudioFabric>
        source="name"
        render={(record) => record.name?.fr ?? '—'}
      />
      <ReferenceField source="modelId" reference="studio-models" link={false}>
        <FunctionField render={(record) => record?.name?.fr ?? record?.slug ?? '—'} />
      </ReferenceField>
      <NumberField source="sortOrder" />
      <BooleanField source="isActive" />
    </Datagrid>
  </List>
);
