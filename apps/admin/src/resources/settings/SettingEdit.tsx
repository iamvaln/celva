import { Edit, SimpleForm, TextInput, required } from 'react-admin';
import type { Setting } from '../../types';

// The form keeps a disabled `key` input for readability, and the record carries
// an `id` from tagRecord (alt primary-key mapping). UpsertSettingDto whitelists
// only { value, label }; without this transform, forbidNonWhitelisted rejects
// the request as soon as you press Save.
const transform = (data: Setting) => ({
  value: data.value,
  label: data.label ?? undefined,
});

export const SettingEdit = () => (
  <Edit mutationMode="pessimistic" transform={transform}>
    <SimpleForm>
      <TextInput source="key" disabled />
      <TextInput source="value" validate={[required()]} multiline minRows={2} />
      <TextInput source="label.fr" label="Label (FR)" />
      <TextInput source="label.en" label="Label (EN)" />
    </SimpleForm>
  </Edit>
);
