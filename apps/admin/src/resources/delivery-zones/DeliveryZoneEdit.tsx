import {
  BooleanInput,
  Edit,
  NumberInput,
  SimpleForm,
  TextInput,
  minValue,
  required,
  useTranslate,
} from 'react-admin';

export const DeliveryZoneEdit = () => {
  const t = useTranslate();
  return (
    <Edit mutationMode="pessimistic">
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
        <NumberInput source="fee" validate={[required(), minValue(0)]} />
        <NumberInput
          source="actualCost"
          validate={[required(), minValue(0)]}
          helperText="resources.delivery-zones.helpers.actual_cost"
        />
        <NumberInput source="freeDeliveryThreshold" validate={[minValue(0)]} />
        <NumberInput source="estimatedDays.min" validate={[minValue(0)]} />
        <NumberInput source="estimatedDays.max" validate={[minValue(0)]} />
        <BooleanInput source="isActive" />
      </SimpleForm>
    </Edit>
  );
};
