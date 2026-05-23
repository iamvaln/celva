import {
  ArrayInput,
  AutocompleteInput,
  Create,
  NumberInput,
  ReferenceInput,
  SimpleForm,
  SimpleFormIterator,
  TextInput,
  minValue,
  required,
} from 'react-admin';

/**
 * Release form. Picks a sales rep + an array of (variant, qty) lines.
 * Hits POST /consignments on submit. The API enforces stock + role.
 */
export const ConsignmentCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <ReferenceInput source="salesRepId" reference="users" filter={{ role: 'SALES_REP' }}>
        <AutocompleteInput
          optionText={(record) => `${record?.name ?? ''} — ${record?.email ?? ''}`}
          validate={[required()]}
          fullWidth
        />
      </ReferenceInput>
      <TextInput
        source="notes"
        helperText="resources.consignments.helpers.notes"
        multiline
        minRows={2}
        fullWidth
      />
      <ArrayInput source="items" validate={[required()]}>
        <SimpleFormIterator inline>
          <ReferenceInput source="variantId" reference="variants">
            <AutocompleteInput
              optionText="sku"
              validate={[required()]}
              sx={{ minWidth: 300 }}
            />
          </ReferenceInput>
          <NumberInput
            source="quantity"
            validate={[required(), minValue(1)]}
            min={1}
          />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Create>
);
