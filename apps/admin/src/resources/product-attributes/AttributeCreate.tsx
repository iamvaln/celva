import {
  Create,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  TextInput,
  minValue,
  required,
  useTranslate,
} from 'react-admin';
import { SortOrderInput } from '../../components/SortOrderInput';

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
          placeholder={translate('resources.attributes.placeholders.name_fr')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="name.en"
          label={translate('resources.attributes.fields.name_en')}
          placeholder={translate('resources.attributes.placeholders.name_en')}
          validate={[required()]}
          fullWidth
        />
        <SortOrderInput
          helperText="resources.attributes.helpers.sort_order_optional"
          validate={[minValue(0)]}
        />
      </SimpleForm>
    </Create>
  );
};
