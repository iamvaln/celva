import {
  BooleanInput,
  Create,
  NumberInput,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  TextInput,
  minValue,
  regex,
  required,
  useTranslate,
} from 'react-admin';
import { COMMISSION_TYPE, PRODUCTION_TYPE } from '@celva/shared';

export const ProductCreate = () => {
  const translate = useTranslate();
  return (
    <Create redirect="edit">
      <SimpleForm>
        <TextInput
          source="name.fr"
          label={translate('resources.products.fields.name_fr')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="name.en"
          label={translate('resources.products.fields.name_en')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="slug"
          helperText="resources.products.helpers.slug_optional"
          validate={[regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'resources.products.errors.invalid_slug')]}
          fullWidth
        />
        <TextInput
          source="description.fr"
          label={translate('resources.products.fields.description_fr')}
          multiline
          minRows={3}
          fullWidth
        />
        <TextInput
          source="description.en"
          label={translate('resources.products.fields.description_en')}
          multiline
          minRows={3}
          fullWidth
        />
        <ReferenceInput source="categoryId" reference="categories" perPage={100}>
          <SelectInput
            optionText={(c: { name?: { fr?: string } }) => c.name?.fr ?? ''}
            validate={[required()]}
          />
        </ReferenceInput>
        <SelectInput
          source="productionType"
          choices={Object.values(PRODUCTION_TYPE).map((t) => ({ id: t, name: t }))}
          validate={[required()]}
          defaultValue="INTERNAL"
        />
        <NumberInput source="displayPrice" validate={[required(), minValue(0)]} />
        <NumberInput source="floorPrice" validate={[required(), minValue(0)]} />
        <NumberInput
          source="costPrice"
          helperText="resources.products.helpers.cost_price"
          validate={[minValue(0)]}
        />
        <SelectInput
          source="defaultCommissionType"
          choices={Object.values(COMMISSION_TYPE).map((c) => ({ id: c, name: c }))}
          defaultValue="PERCENTAGE"
        />
        <NumberInput source="defaultCommissionValue" defaultValue={0} validate={[minValue(0)]} />
        <BooleanInput source="isActive" defaultValue />
      </SimpleForm>
    </Create>
  );
};
