import {
  BooleanInput,
  Create,
  NumberInput,
  SimpleForm,
  TextInput,
  minValue,
  required,
  useTranslate,
} from 'react-admin';

export const DeliveryZoneCreate = () => {
  const t = useTranslate();
  return (
    <Create redirect="list">
      <SimpleForm>
        <TextInput
          source="name.fr"
          label={t('resources.delivery-zones.fields.name_fr')}
          validate={[required()]}
          fullWidth
        />
        <TextInput
          source="name.en"
          label={t('resources.delivery-zones.fields.name_en')}
          validate={[required()]}
          fullWidth
        />
        <NumberInput
          source="fee"
          validate={[required(), minValue(0)]}
          helperText="resources.delivery-zones.helpers.fee"
        />
        <NumberInput
          source="actualCost"
          validate={[required(), minValue(0)]}
          helperText="resources.delivery-zones.helpers.actual_cost"
        />
        <NumberInput
          source="freeDeliveryThreshold"
          validate={[minValue(0)]}
          helperText="resources.delivery-zones.helpers.free_threshold"
        />
        <NumberInput source="estimatedDays.min" validate={[minValue(0)]} />
        <NumberInput source="estimatedDays.max" validate={[minValue(0)]} />
        <BooleanInput source="isActive" defaultValue />
      </SimpleForm>
    </Create>
  );
};
