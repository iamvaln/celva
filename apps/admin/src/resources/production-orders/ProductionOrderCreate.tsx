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

const TYPES = ['INTERNAL', 'SUBCONTRACTED'] as const;

export const ProductionOrderCreate = () => (
  <Create redirect="show">
    <SimpleForm defaultValues={{ type: 'INTERNAL', quantity: 1 }}>
      <ReferenceInput source="productId" reference="products">
        <AutocompleteInput optionText="slug" validate={[required()]} fullWidth />
      </ReferenceInput>
      <SelectInput
        source="type"
        choices={TYPES.map((t) => ({ id: t, name: t }))}
        validate={[required()]}
      />
      <NumberInput source="quantity" validate={[required(), minValue(1)]} />
      <NumberInput
        source="laborCost"
        validate={[minValue(0)]}
        helperText="resources.production-orders.helpers.labor"
      />
      <NumberInput
        source="subcontractCost"
        validate={[minValue(0)]}
        helperText="resources.production-orders.helpers.subcontract"
      />
      <TextInput source="subcontractorName" />
      <ArrayInput source="consumptions" validate={[required()]}>
        <SimpleFormIterator inline>
          <ReferenceInput source="rawMaterialId" reference="raw-materials">
            <AutocompleteInput optionText="name" validate={[required()]} sx={{ minWidth: 260 }} />
          </ReferenceInput>
          <NumberInput source="quantityUsed" validate={[required(), minValue(0.01)]} />
        </SimpleFormIterator>
      </ArrayInput>
      <ArrayInput source="stages">
        <SimpleFormIterator inline>
          <TextInput source="name" validate={[required()]} />
        </SimpleFormIterator>
      </ArrayInput>
      <TextInput source="notes" multiline minRows={2} fullWidth />
    </SimpleForm>
  </Create>
);
