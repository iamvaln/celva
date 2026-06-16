import {
  BooleanInput,
  Edit,
  NumberInput,
  SimpleForm,
  TextInput,
  minValue,
  regex,
  required,
} from 'react-admin';
import { ImageDropInput } from '../../components/ImageDropInput';

export const StudioModelEdit = () => (
  <Edit redirect="list" mutationMode="pessimistic">
    <SimpleForm>
      <TextInput
        source="slug"
        validate={[required(), regex(/^[a-z0-9-]+$/, 'resources.studio-models.errors.invalid_slug')]}
        fullWidth
      />
      <TextInput source="name.fr" validate={[required()]} fullWidth />
      <TextInput source="name.en" validate={[required()]} fullWidth />
      <TextInput source="shortDescription.fr" multiline minRows={2} fullWidth />
      <TextInput source="shortDescription.en" multiline minRows={2} fullWidth />
      <TextInput source="material.fr" fullWidth />
      <TextInput source="material.en" fullWidth />
      <NumberInput source="basePrice" validate={[required(), minValue(0)]} />
      <TextInput source="delayLabel.fr" validate={[required()]} fullWidth />
      <TextInput source="delayLabel.en" validate={[required()]} fullWidth />
      <ImageDropInput
        source="coverImage"
        aspectRatio={3 / 4}
        helperText="resources.studio-models.helpers.cover_image"
      />
      <NumberInput source="sortOrder" min={0} />
      <BooleanInput source="isActive" />
    </SimpleForm>
  </Edit>
);
