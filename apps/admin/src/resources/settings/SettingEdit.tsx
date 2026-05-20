import { Edit, SimpleForm, TextInput, required } from 'react-admin';

export const SettingEdit = () => (
  <Edit mutationMode="pessimistic">
    <SimpleForm>
      <TextInput source="key" disabled />
      <TextInput source="value" validate={[required()]} multiline minRows={2} />
      <TextInput source="label.fr" label="Label (FR)" />
      <TextInput source="label.en" label="Label (EN)" />
    </SimpleForm>
  </Edit>
);
