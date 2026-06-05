import {
  BooleanInput,
  Create,
  SelectInput,
  SimpleForm,
  TextInput,
  required,
} from 'react-admin';
import { typeChoices } from './constants';

export const PaymentAccountCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput
        source="name"
        validate={[required()]}
        helperText="resources.payment-accounts.helpers.name"
        fullWidth
      />
      <SelectInput
        source="type"
        choices={typeChoices}
        validate={[required()]}
        defaultValue="CASH"
      />
      <TextInput
        source="identifier"
        helperText="resources.payment-accounts.helpers.identifier"
        fullWidth
      />
      <BooleanInput source="isActive" defaultValue />
    </SimpleForm>
  </Create>
);
