import {
  BooleanInput,
  Edit,
  SimpleForm,
  TextInput,
  required,
  useTranslate,
} from 'react-admin';

export const PickupPointEdit = () => {
  const t = useTranslate();
  return (
    <Edit mutationMode="pessimistic">
      <SimpleForm>
        <TextInput
          source="name.fr"
          label={t('resources.pickup-points.fields.name_fr')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="name.en"
          label={t('resources.pickup-points.fields.name_en')}
          validate={[required()]}
          fullWidth
        />
        <TextInput source="address" validate={[required()]} fullWidth />
        <TextInput source="city" validate={[required()]} />
        <TextInput source="phone" helperText="resources.pickup-points.helpers.phone" />
        <TextInput
          source="hours.fr"
          label={t('resources.pickup-points.fields.hours_fr')}
          fullWidth
        />
        <TextInput
          source="hours.en"
          label={t('resources.pickup-points.fields.hours_en')}
          fullWidth
        />
        <BooleanInput source="isActive" />
      </SimpleForm>
    </Edit>
  );
};
