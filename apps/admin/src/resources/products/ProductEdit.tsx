import {
  BooleanInput,
  Button,
  Edit,
  NumberInput,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  TextInput,
  TopToolbar,
  minValue,
  regex,
  required,
  useNotify,
  useRecordContext,
  useRedirect,
  useTranslate,
} from 'react-admin';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { COMMISSION_TYPE, PRODUCTION_TYPE } from '@celva/shared';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

const DuplicateButton = () => {
  const record = useRecordContext<{ id: string }>();
  const notify = useNotify();
  const redirect = useRedirect();
  const translate = useTranslate();

  if (!record) return null;

  const handleClick = async () => {
    try {
      const { body } = await fetchJson<{ id: string }>(
        `${API_BASE}/products/${record.id}/duplicate`,
        { method: 'POST' },
      );
      notify('resources.products.notifications.duplicated', { type: 'success' });
      redirect('edit', 'products', body.id);
    } catch (err) {
      notify(err instanceof Error ? err.message : translate('ra.notification.http_error'), {
        type: 'error',
      });
    }
  };

  return (
    <Button
      label="resources.products.actions.duplicate"
      onClick={handleClick}
      startIcon={<ContentCopyIcon />}
    />
  );
};

const ProductEditActions = () => (
  <TopToolbar>
    <DuplicateButton />
  </TopToolbar>
);

export const ProductEdit = () => {
  const translate = useTranslate();
  return (
    <Edit mutationMode="pessimistic" actions={<ProductEditActions />}>
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
          validate={[required(), regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'resources.products.errors.invalid_slug')]}
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
        />
        <NumberInput source="defaultCommissionValue" validate={[minValue(0)]} />
        <BooleanInput source="isActive" />
      </SimpleForm>
    </Edit>
  );
};
