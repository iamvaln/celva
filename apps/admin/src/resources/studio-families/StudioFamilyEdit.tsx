import {
  BooleanInput,
  Edit,
  SimpleForm,
  TextInput,
  regex,
  required,
} from 'react-admin';
import { ImageDropInput } from '../../components/ImageDropInput';
import { SlugInput } from '../../components/SlugInput';
import { SortOrderInput } from '../../components/SortOrderInput';

export const StudioFamilyEdit = () => (
  <Edit redirect="list" mutationMode="pessimistic">
    <SimpleForm>
      <TextInput source="name.fr" validate={[required()]} fullWidth />
      <TextInput source="name.en" validate={[required()]} fullWidth />
      <SlugInput
        source="slug"
        from="name.fr"
        validate={[required(), regex(/^[a-z0-9-]+$/, 'resources.studio-families.errors.invalid_slug')]}
        fullWidth
      />
      <TextInput source="description.fr" multiline minRows={2} fullWidth />
      <TextInput source="description.en" multiline minRows={2} fullWidth />
      <ImageDropInput
        source="coverImage"
        aspectRatio={4 / 5}
        helperText="resources.studio-families.helpers.cover_image"
      />
      <SortOrderInput />
      <BooleanInput source="isActive" />
    </SimpleForm>
  </Edit>
);
