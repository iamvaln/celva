import { Edit, SimpleForm, TextInput, email, required } from 'react-admin';

export const SupplierEdit = () => (
  <Edit mutationMode="pessimistic">
    <SimpleForm>
      <TextInput source="name" validate={[required()]} fullWidth />
      <TextInput source="contact" fullWidth />
      <TextInput source="phone" />
      <TextInput source="email" validate={[email()]} fullWidth />
      <TextInput source="address" multiline minRows={2} fullWidth />
    </SimpleForm>
  </Edit>
);
