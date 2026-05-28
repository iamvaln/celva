import {
  Edit,
  NumberInput,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  TextInput,
  AutocompleteInput,
  minValue,
  required,
} from 'react-admin';

const TYPES = ['FABRIC', 'ACCESSORY', 'PACKAGING', 'OTHER'] as const;

export const RawMaterialEdit = () => (
  <Edit mutationMode="pessimistic">
    <SimpleForm>
      <TextInput source="name" validate={[required()]} fullWidth />
      <SelectInput
        source="type"
        choices={TYPES.map((t) => ({ id: t, name: t }))}
        validate={[required()]}
      />
      <TextInput source="unit" validate={[required()]} />
      <NumberInput source="unitPrice" validate={[required(), minValue(0)]} />
      <NumberInput
        source="stockQty"
        validate={[minValue(0)]}
        helperText="resources.raw-materials.helpers.stock_manual"
      />
      <NumberInput
        source="alertThreshold"
        validate={[minValue(0)]}
        helperText="resources.raw-materials.helpers.alert_threshold"
      />
      <ReferenceInput source="supplierId" reference="suppliers">
        <AutocompleteInput optionText="name" validate={[required()]} fullWidth />
      </ReferenceInput>
      <TextInput
        source="imageKey"
        helperText="resources.raw-materials.helpers.image"
        fullWidth
      />
    </SimpleForm>
  </Edit>
);
