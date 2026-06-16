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
import type { StudioGalleryItem } from '../../types';

const filters = [
  <ReferenceInput key="modelId" source="modelId" reference="studio-models" alwaysOn>
    <SelectInput
      optionText={(record) => record?.name?.fr ?? record?.slug ?? '—'}
      label="resources.studio-gallery.fields.model"
    />
  </ReferenceInput>,
];

const Thumb = ({ src }: { src: string | null }) =>
  src ? (
    <Box
      component="img"
      src={src}
      alt=""
      sx={{ width: 56, height: 72, objectFit: 'cover' }}
    />
  ) : (
    <Box sx={{ width: 56, height: 72, bgcolor: 'action.hover' }} />
  );

export const StudioGalleryList = () => (
  <List filters={filters} sort={{ field: 'sortOrder', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <FunctionField<StudioGalleryItem>
        label=""
        render={(record) => <Thumb src={record.imageKey} />}
      />
      <ReferenceField source="modelId" reference="studio-models" link={false}>
        <FunctionField render={(record) => record?.name?.fr ?? record?.slug ?? '—'} />
      </ReferenceField>
      <FunctionField<StudioGalleryItem>
        label="resources.studio-gallery.fields.caption"
        render={(record) => record.caption?.fr ?? '—'}
      />
      <BooleanField source="isTall" />
      <NumberField source="sortOrder" />
      <BooleanField source="isActive" />
    </Datagrid>
  </List>
);
