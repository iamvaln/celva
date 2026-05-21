import {
  Create,
  NumberInput,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  TextInput,
  minValue,
  required,
  useTranslate,
} from 'react-admin';

export const AttributeCreate = () => {
  const translate = useTranslate();
  return (
    <Create redirect="list">
      <SimpleForm>
        <ReferenceInput source="productId" reference="products" perPage={50}>
          <SelectInput
            optionText={(p: { name?: { fr?: string } }) => p.name?.fr ?? ''}
            validate={[required()]}
          />
        </ReferenceInput>
        <TextInput
          source="name.fr"
          label={translate('resources.attributes.fields.name_fr')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="name.en"
          label={translate('resources.attributes.fields.name_en')}
          validate={[required()]}
          fullWidth
        />
        <NumberInput
          source="sortOrder"
          helperText="resources.attributes.helpers.sort_order_optional"
          validate={[minValue(0)]}
        />
      </SimpleForm>
    </Create>
  );
};
