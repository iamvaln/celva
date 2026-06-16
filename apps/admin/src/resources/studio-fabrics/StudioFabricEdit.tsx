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

export const StudioFabricEdit = () => (
  <Edit redirect="list" mutationMode="pessimistic">
    <SimpleForm>
      <ReferenceInput source="modelId" reference="studio-models">
        <AutocompleteInput
          optionText={(record) => record?.name?.fr ?? record?.slug ?? '—'}
          validate={[required()]}
        />
      </ReferenceInput>
      <TextInput source="name.fr" validate={[required()]} fullWidth />
      <TextInput source="name.en" validate={[required()]} fullWidth />
      <ImageDropInput source="swatchImage" aspectRatio={1} helperText="resources.studio-fabrics.helpers.swatch_image" />
      <ImageDropInput source="photoImage" aspectRatio={3 / 4} helperText="resources.studio-fabrics.helpers.photo_image" />
      <NumberInput source="sortOrder" min={0} />
      <BooleanInput source="isActive" />
    </SimpleForm>
  </Edit>
);
