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
import { SlugInput } from '../../components/SlugInput';
import { AiAssistButton } from '../../components/AiAssistButton';

export const ProductCreate = () => {
  const translate = useTranslate();
  return (
    <Create redirect="edit">
      <SimpleForm>
        <TextInput
          source="name.fr"
          label={translate('resources.products.fields.name_fr')}
          placeholder={translate('resources.products.placeholders.name_fr')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="name.en"
          label={translate('resources.products.fields.name_en')}
          placeholder={translate('resources.products.placeholders.name_en')}
          validate={[required()]}
          fullWidth
        />
        <AiAssistButton
          mode="translate"
          sourceField="name.fr"
          targetField="name.en"
          sourceLocale="fr"
          targetLocale="en"
          kind="name"
        />
        <SlugInput
          source="slug"
          from="name.fr"
          helperText="resources.products.helpers.slug_optional"
          validate={[regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'resources.products.errors.invalid_slug')]}
          fullWidth
        />
        <TextInput
          source="description.fr"
          label={translate('resources.products.fields.description_fr')}
          placeholder={translate('resources.products.placeholders.description_fr')}
          multiline
          minRows={3}
          fullWidth
        />
        <AiAssistButton
          mode="generate"
          nameField="name.fr"
          targetField="description.fr"
          locale="fr"
        />
        <TextInput
          source="description.en"
          label={translate('resources.products.fields.description_en')}
          placeholder={translate('resources.products.placeholders.description_en')}
          multiline
          minRows={3}
          fullWidth
        />
        <AiAssistButton
          mode="translate"
          sourceField="description.fr"
          targetField="description.en"
          sourceLocale="fr"
          targetLocale="en"
          kind="description"
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
        <NumberInput
          source="displayPrice"
          helperText="resources.products.helpers.display_price"
          validate={[required(), minValue(0)]}
        />
        <NumberInput
          source="floorPrice"
          helperText="resources.products.helpers.floor_price"
          validate={[required(), minValue(0)]}
        />
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
