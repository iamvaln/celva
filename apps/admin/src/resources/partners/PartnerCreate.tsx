import {
  BooleanInput,
  Create,
  NumberInput,
  SimpleForm,
  TextInput,
  email,
  maxValue,
  minValue,
  required,
} from 'react-admin';

export const PartnerCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput source="name" validate={[required()]} fullWidth />
      <TextInput source="email" validate={[email()]} fullWidth />
      <NumberInput
        source="equityShare"
        validate={[minValue(0), maxValue(100)]}
        helperText="ui.partners.equity_hint"
      />
      <TextInput source="notes" multiline minRows={2} fullWidth />
      <BooleanInput source="isActive" defaultValue />
    </SimpleForm>
  </Create>
);
