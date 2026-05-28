import {
  ArrayInput,
  AutocompleteInput,
  Create,
  NumberInput,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  SimpleFormIterator,
  TextInput,
  minValue,
  required,
} from 'react-admin';

const COST_TYPES = ['TRANSPORT', 'CUSTOMS', 'BUYER_COMMISSION', 'INSURANCE', 'OTHER'] as const;

export const PurchaseOrderCreate = () => (
  <Create redirect="show">
    <SimpleForm>
      <ReferenceInput source="supplierId" reference="suppliers">
        <AutocompleteInput optionText="name" validate={[required()]} fullWidth />
      </ReferenceInput>
      <TextInput source="notes" multiline minRows={2} fullWidth />
      <ArrayInput source="items" validate={[required()]}>
        <SimpleFormIterator inline>
          <ReferenceInput source="rawMaterialId" reference="raw-materials">
            <AutocompleteInput optionText="name" validate={[required()]} sx={{ minWidth: 260 }} />
          </ReferenceInput>
          <NumberInput source="quantity" validate={[required(), minValue(0.01)]} />
          <NumberInput source="unitPrice" validate={[required(), minValue(0)]} />
        </SimpleFormIterator>
      </ArrayInput>
      <ArrayInput source="costs">
        <SimpleFormIterator inline>
          <SelectInput
            source="type"
            choices={COST_TYPES.map((c) => ({ id: c, name: c }))}
            validate={[required()]}
          />
          <NumberInput source="amount" validate={[required(), minValue(0)]} />
          <TextInput source="description" />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Create>
);
