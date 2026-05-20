import {
  BooleanInput,
  Create,
  PasswordInput,
  SelectInput,
  SimpleForm,
  TextInput,
  required,
  email,
  minLength,
} from 'react-admin';
import { PASSWORD_MIN_LENGTH, USER_ROLE } from '@celva/shared';

export const UserCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="email" validate={[required(), email()]} />
      <TextInput source="name" validate={[required(), minLength(2)]} />
      <PasswordInput source="password" validate={[required(), minLength(PASSWORD_MIN_LENGTH)]} />
      <TextInput source="phone" />
      <SelectInput
        source="role"
        choices={Object.values(USER_ROLE).map((role) => ({ id: role, name: role }))}
        validate={[required()]}
        defaultValue={USER_ROLE.CLIENT}
      />
      <BooleanInput source="isActive" defaultValue />
    </SimpleForm>
  </Create>
);
