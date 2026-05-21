import {
  BooleanInput,
  Create,
  NumberInput,
  SimpleForm,
  TextInput,
  minValue,
  regex,
  required,
  useTranslate,
} from 'react-admin';

export const CollectionCreate = () => {
  const translate = useTranslate();
  return (
    <Create redirect="edit">
      <SimpleForm>
        <TextInput
          source="name.fr"
          label={translate('resources.collections.fields.name_fr')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="name.en"
          label={translate('resources.collections.fields.name_en')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="slug"
          helperText="resources.collections.helpers.slug_optional"
          validate={[regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'resources.collections.errors.invalid_slug')]}
          fullWidth
        />
        <TextInput
          source="description.fr"
          label={translate('resources.collections.fields.description_fr')}
          multiline
          minRows={2}
          fullWidth
        />
        <TextInput
          source="description.en"
          label={translate('resources.collections.fields.description_en')}
          multiline
          minRows={2}
          fullWidth
        />
        <TextInput source="imageUrl" fullWidth />
        <NumberInput source="sortOrder" defaultValue={0} validate={[minValue(0)]} />
        <BooleanInput source="isActive" defaultValue />
      </SimpleForm>
    </Create>
  );
};
