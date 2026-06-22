import {
  BooleanInput,
  Create,
  NumberInput,
  SimpleForm,
  TextInput,
  regex,
  required,
} from 'react-admin';
import { ImageDropInput } from '../../components/ImageDropInput';

export const StudioFamilyCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput
        source="slug"
        helperText="resources.studio-families.helpers.slug_optional"
        validate={[regex(/^[a-z0-9-]*$/, 'resources.studio-families.errors.invalid_slug')]}
        fullWidth
      />
      <TextInput source="name.fr" validate={[required()]} fullWidth />
      <TextInput source="name.en" validate={[required()]} fullWidth />
      <TextInput source="description.fr" multiline minRows={2} fullWidth />
      <TextInput source="description.en" multiline minRows={2} fullWidth />
      <ImageDropInput
        source="coverImage"
        aspectRatio={4 / 5}
        helperText="resources.studio-families.helpers.cover_image"
      />
      <NumberInput source="sortOrder" min={0} defaultValue={0} />
      <BooleanInput source="isActive" defaultValue={true} />
    </SimpleForm>
  </Create>
);
