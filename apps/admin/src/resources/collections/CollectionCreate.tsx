import {
  BooleanInput,
  Create,
  SimpleForm,
  TextInput,
  minValue,
  regex,
  required,
  useTranslate,
} from 'react-admin';
import { ImageDropInput } from '../../components/ImageDropInput';
import { SlugInput } from '../../components/SlugInput';
import { SortOrderInput } from '../../components/SortOrderInput';

export const CollectionCreate = () => {
  const translate = useTranslate();
  return (
    <Create redirect="edit">
      <SimpleForm>
        <TextInput
          source="name.fr"
          label={translate('resources.collections.fields.name_fr')}
          placeholder={translate('resources.collections.placeholders.name_fr')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="name.en"
          label={translate('resources.collections.fields.name_en')}
          placeholder={translate('resources.collections.placeholders.name_en')}
          validate={[required()]}
          fullWidth
        />
        <SlugInput
          source="slug"
          from="name.fr"
          helperText="resources.collections.helpers.slug_optional"
          validate={[regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'resources.collections.errors.invalid_slug')]}
          fullWidth
        />
        <TextInput
          source="description.fr"
          label={translate('resources.collections.fields.description_fr')}
          placeholder={translate('resources.collections.placeholders.description_fr')}
          multiline
          minRows={2}
          fullWidth
        />
        <TextInput
          source="description.en"
          label={translate('resources.collections.fields.description_en')}
          placeholder={translate('resources.collections.placeholders.description_en')}
          multiline
          minRows={2}
          fullWidth
        />
        <ImageDropInput source="imageUrl" aspectRatio={21 / 9} />
        <SortOrderInput defaultValue={0} validate={[minValue(0)]} />
        <BooleanInput source="isActive" defaultValue />
      </SimpleForm>
    </Create>
  );
};
