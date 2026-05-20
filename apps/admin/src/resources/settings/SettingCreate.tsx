import { Create, SimpleForm, TextInput, regex, required } from 'react-admin';

export const SettingCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput
        source="key"
        validate={[
          required(),
          regex(/^[A-Z][A-Z0-9_]{1,63}$/, 'UPPER_SNAKE_CASE required'),
        ]}
      />
      <TextInput source="value" validate={[required()]} multiline minRows={2} />
      <TextInput source="label.fr" label="Label (FR)" />
      <TextInput source="label.en" label="Label (EN)" />
    </SimpleForm>
  </Create>
);
