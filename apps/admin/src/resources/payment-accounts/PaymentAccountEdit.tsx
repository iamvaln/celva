import {
  BooleanInput,
  Edit,
  SelectInput,
  SimpleForm,
  TextInput,
  required,
} from 'react-admin';
import { typeChoices } from './constants';

export const PaymentAccountEdit = () => (
  <Edit mutationMode="pessimistic" redirect="list">
    <SimpleForm>
      <TextInput source="name" validate={[required()]} fullWidth />
      <SelectInput source="type" choices={typeChoices} validate={[required()]} />
      <TextInput
        source="identifier"
        helperText="resources.payment-accounts.helpers.identifier"
        fullWidth
      />
      <BooleanInput source="isActive" />
    </SimpleForm>
  </Edit>
);
