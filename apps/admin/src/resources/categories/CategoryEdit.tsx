import {
  Edit,
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

export const CategoryEdit = () => {
  const translate = useTranslate();
  return (
    <Edit mutationMode="pessimistic">
      <SimpleForm>
        <TextInput
          source="name.fr"
          label={translate('resources.categories.fields.name_fr')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="name.en"
          label={translate('resources.categories.fields.name_en')}
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
          validate={[required(), regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'resources.categories.errors.invalid_slug')]}
          fullWidth
        />
        <TextInput
          source="description.fr"
          label={translate('resources.categories.fields.description_fr')}
          multiline
          minRows={2}
          fullWidth
        />
        <TextInput
          source="description.en"
          label={translate('resources.categories.fields.description_en')}
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
        <SortOrderInput validate={[minValue(0)]} />
      </SimpleForm>
    </Edit>
  );
};
