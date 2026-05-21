import {
  BooleanInput,
  Create,
  DateTimeInput,
  NumberInput,
  SelectInput,
  SimpleForm,
  TextInput,
  minValue,
  regex,
  required,
} from 'react-admin';
import { PROMO_CODE_TYPE } from '@celva/shared';

export const PromoCodeCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput
        source="code"
        validate={[
          required(),
          regex(/^[A-Z0-9][A-Z0-9_-]{1,31}$/, 'resources.promo-codes.errors.invalid_format'),
        ]}
        helperText="resources.promo-codes.helpers.code_format"
      />
      <SelectInput
        source="type"
        choices={Object.values(PROMO_CODE_TYPE).map((t) => ({ id: t, name: t }))}
        validate={[required()]}
        defaultValue="PERCENTAGE"
      />
      <NumberInput
        source="value"
        validate={[required(), minValue(0)]}
        helperText="resources.promo-codes.helpers.value"
      />
      <NumberInput source="minOrderAmount" validate={[minValue(0)]} />
      <NumberInput source="maxUses" validate={[minValue(1)]} />
      <NumberInput source="maxUsesPerUser" validate={[minValue(1)]} />
      <BooleanInput source="isActive" defaultValue />
      <DateTimeInput source="startsAt" />
      <DateTimeInput source="expiresAt" />
    </SimpleForm>
  </Create>
);
