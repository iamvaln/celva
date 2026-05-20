import {
  BooleanInput,
  Edit,
  SelectInput,
  SimpleForm,
  TextInput,
  required,
  email,
  minLength,
} from 'react-admin';
import { USER_ROLE } from '@celva/shared';

export const UserEdit = () => (
  <Edit mutationMode="pessimistic">
    <SimpleForm>
      <TextInput source="email" validate={[required(), email()]} disabled />
      <TextInput source="name" validate={[required(), minLength(2)]} />
      <TextInput source="phone" />
      <SelectInput
        source="role"
        choices={Object.values(USER_ROLE).map((role) => ({ id: role, name: role }))}
        validate={[required()]}
      />
      <BooleanInput source="isActive" />
    </SimpleForm>
  </Edit>
);
