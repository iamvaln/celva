import {
  Create,
  SimpleForm,
  TextInput,
  minValue,
  regex,
  required,
  useTranslate,
} from 'react-admin';
import { SlugInput } from '../../components/SlugInput';
import { SortOrderInput } from '../../components/SortOrderInput';
import { AiAssistButton } from '../../components/AiAssistButton';

export const CategoryCreate = () => {
  const translate = useTranslate();
  return (
    <Create redirect="list">
      <SimpleForm>
        <TextInput
          source="name.fr"
          label={translate('resources.categories.fields.name_fr')}
          placeholder={translate('resources.categories.placeholders.name_fr')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="name.en"
          label={translate('resources.categories.fields.name_en')}
          placeholder={translate('resources.categories.placeholders.name_en')}
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
          helperText="resources.categories.helpers.slug_optional"
          validate={[regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'resources.categories.errors.invalid_slug')]}
          fullWidth
        />
        <TextInput
          source="description.fr"
          label={translate('resources.categories.fields.description_fr')}
          placeholder={translate('resources.categories.placeholders.description_fr')}
          multiline
          minRows={2}
          fullWidth
        />
        <TextInput
          source="description.en"
          label={translate('resources.categories.fields.description_en')}
          placeholder={translate('resources.categories.placeholders.description_en')}
          multiline
          minRows={2}
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
        <SortOrderInput defaultValue={0} validate={[minValue(0)]} />
      </SimpleForm>
    </Create>
  );
};
