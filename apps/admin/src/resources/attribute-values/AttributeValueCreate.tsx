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
import type { ProductAttribute } from '../../types';

export const AttributeValueCreate = () => {
  const translate = useTranslate();
  return (
    <Create redirect="list">
      <SimpleForm>
        <ReferenceInput source="attributeId" reference="attributes" perPage={100}>
          <SelectInput
            optionText={(a: ProductAttribute) =>
              `${a.name?.fr ?? ''} / ${a.name?.en ?? ''}`.replace(/^ \/ | \/ $/g, '')
            }
            validate={[required()]}
          />
        </ReferenceInput>
        <TextInput
          source="value.fr"
          label={translate('resources.attribute-values.fields.value_fr')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="value.en"
          label={translate('resources.attribute-values.fields.value_en')}
          validate={[required()]}
          fullWidth
        />
        <NumberInput
          source="sortOrder"
          helperText="resources.attribute-values.helpers.sort_order_optional"
          validate={[minValue(0)]}
        />
      </SimpleForm>
    </Create>
  );
};
