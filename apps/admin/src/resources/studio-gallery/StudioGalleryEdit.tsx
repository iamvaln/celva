import {
  AutocompleteInput,
  BooleanInput,
  Edit,
  NumberInput,
  ReferenceInput,
  SimpleForm,
  TextInput,
  required,
} from 'react-admin';
import { ImageDropInput } from '../../components/ImageDropInput';

export const StudioGalleryEdit = () => (
  <Edit redirect="list" mutationMode="pessimistic">
    <SimpleForm>
      <ReferenceInput source="modelId" reference="studio-models">
        <AutocompleteInput
          optionText={(record) => record?.name?.fr ?? record?.slug ?? '—'}
          validate={[required()]}
        />
      </ReferenceInput>
      <ImageDropInput source="imageKey" aspectRatio={3 / 4} />
      <TextInput source="caption.fr" fullWidth />
      <TextInput source="caption.en" fullWidth />
      <BooleanInput source="isTall" helperText="resources.studio-gallery.helpers.isTall" />
      <NumberInput source="sortOrder" min={0} />
      <BooleanInput source="isActive" />
    </SimpleForm>
  </Edit>
);
