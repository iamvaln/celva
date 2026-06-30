import {
  Edit,
  Labeled,
  ReferenceField,
  SimpleForm,
  TextField,
  TextInput,
  minValue,
  required,
  useTranslate,
} from 'react-admin';
import { SortOrderInput } from '../../components/SortOrderInput';

/**
 * productId is intentionally read-only here. Moving an attribute between
 * products would invalidate variant-value links; delete and recreate instead.
 */
export const AttributeEdit = () => {
  const translate = useTranslate();
  return (
    <Edit mutationMode="pessimistic">
      <SimpleForm>
        <Labeled label="resources.attributes.fields.productId">
          <ReferenceField source="productId" reference="products" link="edit">
            <TextField source="slug" />
          </ReferenceField>
        </Labeled>
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
        <SortOrderInput validate={[minValue(0)]} />
      </SimpleForm>
    </Edit>
  );
};
