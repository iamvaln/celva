import {
  Edit,
  NumberInput,
  SimpleForm,
  TextInput,
  minValue,
  regex,
  required,
  useTranslate,
} from 'react-admin';

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
        <TextInput
          source="slug"
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
        <NumberInput source="sortOrder" validate={[minValue(0)]} />
      </SimpleForm>
    </Edit>
  );
};
