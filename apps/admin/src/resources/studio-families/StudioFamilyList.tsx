import {
  BooleanField,
  Datagrid,
  DateField,
  FunctionField,
  List,
  NumberField,
  SearchInput,
  SelectInput,
  TextField,
} from 'react-admin';
import { Box } from '@mui/material';
import type { StudioFabricFamily } from '../../types';

const filters = [
  <SearchInput key="search" source="search" alwaysOn />,
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
      sx={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 0 }}
    />
  ) : (
    <Box sx={{ width: 56, height: 56, bgcolor: 'action.hover' }} />
  );

export const StudioFamilyList = () => (
  <List
    filters={filters}
    sort={{ field: 'sortOrder', order: 'ASC' }}
    perPage={25}
  >
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <FunctionField<StudioFabricFamily>
        label=""
        render={(record) => <Thumb src={record.coverImage} />}
      />
      <TextField source="slug" />
      <FunctionField<StudioFabricFamily>
        source="name"
        render={(record) => record.name?.fr ?? record.slug}
      />
      <FunctionField<StudioFabricFamily>
        label="resources.studio-families.fields.fabrics_count"
        render={(record) => record.fabrics?.length ?? 0}
      />
      <FunctionField<StudioFabricFamily>
        label="resources.studio-families.fields.garments_count"
        render={(record) => record.garments?.length ?? 0}
      />
      <BooleanField source="isActive" />
      <NumberField source="sortOrder" />
      <DateField source="createdAt" />
    </Datagrid>
  </List>
);
