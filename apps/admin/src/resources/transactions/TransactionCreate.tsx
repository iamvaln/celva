import {
  Create,
  DateTimeInput,
  NumberInput,
  SelectInput,
  SimpleForm,
  TextInput,
  minValue,
  required,
} from 'react-admin';

const TYPES = ['INCOME', 'EXPENSE'] as const;
const CATEGORIES = [
  'SALE',
  'RAW_MATERIALS',
  'SUBCONTRACTING',
  'MARKETING',
  'TRANSPORT',
  'CUSTOMS',
  'SALARY',
  'RENT',
  'EQUIPMENT',
  'PACKAGING',
  'DELIVERY',
  'COMMISSION',
  'OTHER',
] as const;

export const TransactionCreate = () => (
  <Create redirect="list">
    <SimpleForm defaultValues={{ type: 'EXPENSE', category: 'RAW_MATERIALS' }}>
      <SelectInput
        source="type"
        choices={TYPES.map((t) => ({ id: t, name: t }))}
        validate={[required()]}
      />
      <SelectInput
        source="category"
        choices={CATEGORIES.map((c) => ({ id: c, name: c }))}
        validate={[required()]}
      />
      <NumberInput
        source="amount"
        validate={[required(), minValue(0.01)]}
        helperText="resources.transactions.helpers.amount"
      />
      <DateTimeInput
        source="date"
        helperText="resources.transactions.helpers.date"
      />
      <TextInput
        source="description"
        multiline
        minRows={2}
        fullWidth
      />
      <TextInput
        source="receiptUrl"
        helperText="resources.transactions.helpers.receipt"
        fullWidth
      />
      <TextInput
        source="orderId"
        helperText="resources.transactions.helpers.order_id"
        fullWidth
      />
    </SimpleForm>
  </Create>
);
