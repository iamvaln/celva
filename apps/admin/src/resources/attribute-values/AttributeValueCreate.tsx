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
import type { ProductAttribute } from '../../types';
import { SortOrderInput } from '../../components/SortOrderInput';
import { ColorInput } from './ColorInput';

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
          placeholder={translate('resources.attribute-values.placeholders.value_fr')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="value.en"
          label={translate('resources.attribute-values.fields.value_en')}
          placeholder={translate('resources.attribute-values.placeholders.value_en')}
          validate={[required()]}
          fullWidth
        />
        <SortOrderInput
          helperText="resources.attribute-values.helpers.sort_order_optional"
          validate={[minValue(0)]}
        />
        <ColorInput
          source="colorHex"
          label={translate('resources.attribute-values.fields.color_hex')}
        />
      </SimpleForm>
    </Create>
  );
};
