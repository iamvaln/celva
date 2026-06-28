import {
  BooleanInput,
  Create,
  SimpleForm,
  TextInput,
  regex,
  required,
  useTranslate,
} from 'react-admin';
import { ImageDropInput } from '../../components/ImageDropInput';
import { SlugInput } from '../../components/SlugInput';
import { SortOrderInput } from '../../components/SortOrderInput';

export const StudioFamilyCreate = () => {
  const translate = useTranslate();
  return (
  <Create redirect="list">
    <SimpleForm>
      <TextInput
        source="name.fr"
        placeholder={translate('resources.studio-families.placeholders.name_fr')}
        validate={[required()]}
        fullWidth
      />
      <TextInput
        source="name.en"
        placeholder={translate('resources.studio-families.placeholders.name_en')}
        validate={[required()]}
        fullWidth
      />
      <SlugInput
        source="slug"
        from="name.fr"
        helperText="resources.studio-families.helpers.slug_optional"
        validate={[regex(/^[a-z0-9-]*$/, 'resources.studio-families.errors.invalid_slug')]}
        fullWidth
      />
      <TextInput source="description.fr" multiline minRows={2} fullWidth />
      <TextInput source="description.en" multiline minRows={2} fullWidth />
      <ImageDropInput
        source="coverImage"
        aspectRatio={4 / 5}
        helperText="resources.studio-families.helpers.cover_image"
      />
      <SortOrderInput defaultValue={0} />
      <BooleanInput source="isActive" defaultValue={true} />
    </SimpleForm>
  </Create>
  );
};
