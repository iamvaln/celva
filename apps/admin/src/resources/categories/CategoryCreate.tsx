import {
  Create,
  NumberInput,
  SimpleForm,
  TextInput,
  minValue,
  regex,
  required,
  useTranslate,
} from 'react-admin';

export const CategoryCreate = () => {
  const translate = useTranslate();
  return (
    <Create redirect="list">
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
          helperText="resources.categories.helpers.slug_optional"
          validate={[regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'resources.categories.errors.invalid_slug')]}
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
        <NumberInput source="sortOrder" defaultValue={0} validate={[minValue(0)]} />
      </SimpleForm>
    </Create>
  );
};
