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
import type { StudioModel } from '../../types';

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
      sx={{ width: 56, height: 72, objectFit: 'cover', borderRadius: 0 }}
    />
  ) : (
    <Box sx={{ width: 56, height: 72, bgcolor: 'action.hover' }} />
  );

export const StudioModelList = () => (
  <List
    filters={filters}
    sort={{ field: 'sortOrder', order: 'ASC' }}
    perPage={25}
  >
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <FunctionField<StudioModel>
        label=""
        render={(record) => <Thumb src={record.coverImage} />}
      />
      <TextField source="slug" />
      <FunctionField<StudioModel>
        source="name"
        render={(record) => record.name?.fr ?? record.slug}
      />
      <NumberField source="basePrice" />
      <BooleanField source="isActive" />
      <NumberField source="sortOrder" />
      <DateField source="createdAt" />
    </Datagrid>
  </List>
);
