import {
  BooleanInput,
  Edit,
  NumberInput,
  SimpleForm,
  TextInput,
  minValue,
  regex,
  required,
  useRecordContext,
  useTranslate,
} from 'react-admin';
import { CollectionProductsPanel } from './CollectionProductsPanel';
import { ImageDropInput } from '../../components/ImageDropInput';

export const CollectionEdit = () => {
  const translate = useTranslate();
  return (
    <Edit mutationMode="pessimistic">
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
          validate={[
            required(),
            regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'resources.collections.errors.invalid_slug'),
          ]}
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
        <ImageDropInput source="imageUrl" aspectRatio={21 / 9} />
        <NumberInput source="sortOrder" validate={[minValue(0)]} />
        <BooleanInput source="isActive" />
        <ProductsPanelWithRecord />
      </SimpleForm>
    </Edit>
  );
};

const ProductsPanelWithRecord = () => {
  const record = useRecordContext<{ id: string }>();
  if (!record?.id) return null;
  return <CollectionProductsPanel collectionId={record.id} />;
};
