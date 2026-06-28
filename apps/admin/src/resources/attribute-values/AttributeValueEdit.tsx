import {
  Edit,
  SimpleForm,
  TextInput,
  minValue,
  required,
  useTranslate,
} from 'react-admin';
import { SortOrderInput } from '../../components/SortOrderInput';
import { ColorInput } from './ColorInput';

export const AttributeValueEdit = () => {
  const translate = useTranslate();
  return (
    <Edit mutationMode="pessimistic">
      <SimpleForm>
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
        <SortOrderInput validate={[minValue(0)]} />
        <ColorInput
          source="colorHex"
          label={translate('resources.attribute-values.fields.color_hex')}
        />
      </SimpleForm>
    </Edit>
  );
};
