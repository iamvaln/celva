import {
  AutocompleteInput,
  BooleanInput,
  Create,
  ReferenceInput,
  SimpleForm,
  TextInput,
  required,
} from 'react-admin';
import { ImageDropInput } from '../../components/ImageDropInput';
import { SortOrderInput } from '../../components/SortOrderInput';

export const StudioFabricCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <ReferenceInput source="familyId" reference="studio-families">
        <AutocompleteInput
          optionText={(record) => record?.name?.fr ?? record?.slug ?? '—'}
          validate={[required()]}
        />
      </ReferenceInput>
      <TextInput source="name.fr" validate={[required()]} fullWidth />
      <TextInput source="name.en" validate={[required()]} fullWidth />
      <ImageDropInput
        source="swatchImage"
        aspectRatio={1}
        helperText="resources.studio-fabrics.helpers.swatch_image"
      />
      <ImageDropInput
        source="photoImage"
        aspectRatio={3 / 4}
        helperText="resources.studio-fabrics.helpers.photo_image"
      />
      <SortOrderInput defaultValue={0} />
      <BooleanInput source="isActive" defaultValue={true} />
    </SimpleForm>
  </Create>
);
