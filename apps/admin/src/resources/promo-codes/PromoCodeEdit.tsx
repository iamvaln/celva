import {
  BooleanInput,
  DateTimeInput,
  Edit,
  Labeled,
  NumberInput,
  SelectInput,
  SimpleForm,
  TextField,
  minValue,
  required,
  useTranslate,
} from 'react-admin';
import { PROMO_CODE_TYPE } from '@celva/shared';

/**
 * The code string is locked once created — changing it would invalidate
 * customer flows already typing the old one. Delete + recreate to rotate.
 */
export const PromoCodeEdit = () => {
  const t = useTranslate();
  return (
    <Edit mutationMode="pessimistic">
      <SimpleForm>
        <Labeled label={t('resources.promo-codes.fields.code')}>
          <TextField source="code" />
        </Labeled>
        <SelectInput
          source="type"
          choices={Object.values(PROMO_CODE_TYPE).map((t) => ({ id: t, name: t }))}
          validate={[required()]}
        />
        <NumberInput source="value" validate={[required(), minValue(0)]} />
        <NumberInput source="minOrderAmount" validate={[minValue(0)]} />
        <NumberInput source="maxUses" validate={[minValue(1)]} />
        <NumberInput source="maxUsesPerUser" validate={[minValue(1)]} />
        <Labeled label={t('resources.promo-codes.fields.usedCount')}>
          <TextField source="usedCount" />
        </Labeled>
        <BooleanInput source="isActive" />
        <DateTimeInput source="startsAt" />
        <DateTimeInput source="expiresAt" />
      </SimpleForm>
    </Edit>
  );
};
