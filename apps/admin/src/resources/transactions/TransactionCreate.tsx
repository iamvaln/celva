import {
  Create,
  DateTimeInput,
  FormDataConsumer,
  NumberInput,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  TextInput,
  minValue,
  required,
  useTranslate,
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
  'CAPITAL_CONTRIBUTION',
  'CAPITAL_WITHDRAWAL',
  'OTHER',
] as const;

const CAPITAL_CATEGORIES = ['CAPITAL_CONTRIBUTION', 'CAPITAL_WITHDRAWAL'];

export const TransactionCreate = () => {
  const t = useTranslate();
  return (
    <Create redirect="list">
      <SimpleForm defaultValues={{ type: 'EXPENSE', category: 'RAW_MATERIALS' }}>
        <SelectInput
          source="type"
          choices={TYPES.map((x) => ({
            id: x,
            name: t(`ui.transactions.nature_${x === 'INCOME' ? 'income' : 'expense'}`),
          }))}
          validate={[required()]}
        />
        <SelectInput
          source="category"
          choices={CATEGORIES.map((c) => ({ id: c, name: t(`ui.transactions.cat_${c.toLowerCase()}`) }))}
          validate={[required()]}
        />
        {/* Capital movements (apport / retrait d'associé) require a partner. */}
        <FormDataConsumer>
          {({ formData }) =>
            CAPITAL_CATEGORIES.includes(formData.category as string) ? (
              <ReferenceInput source="partnerId" reference="partners">
                <SelectInput
                  optionText="name"
                  label={t('ui.partners.field_partner')}
                  helperText={t('ui.partners.capital_hint')}
                  validate={[required()]}
                />
              </ReferenceInput>
            ) : null
          }
        </FormDataConsumer>
        <NumberInput
          source="amount"
          validate={[required(), minValue(0.01)]}
          helperText="resources.transactions.helpers.amount"
        />
        <DateTimeInput source="date" helperText="resources.transactions.helpers.date" />
        <TextInput source="description" multiline minRows={2} fullWidth />
        <TextInput source="receiptUrl" helperText="resources.transactions.helpers.receipt" fullWidth />
        <TextInput source="orderId" helperText="resources.transactions.helpers.order_id" fullWidth />
      </SimpleForm>
    </Create>
  );
};
