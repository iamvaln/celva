import {
  DateTimeInput,
  Edit,
  Labeled,
  NumberInput,
  SelectInput,
  SimpleForm,
  TextField,
  TextInput,
  minValue,
  required,
  useRecordContext,
} from 'react-admin';
import { Alert, Box } from '@mui/material';
import type { Transaction } from '../../types';

const TYPES = ['INCOME', 'EXPENSE'] as const;
const CATEGORIES = [
  'SALE',
  'RAW_MATERIALS',
  'SUBCONTRACTING',
  'MARKETING',
  'TRANSPORT',
  'CUSTOMS',
  'SALARY',
  'RENT',
  'EQUIPMENT',
  'PACKAGING',
  'DELIVERY',
  'COMMISSION',
  'OTHER',
] as const;

/**
 * Auto-generated rows (orderId != null) are written by PaymentsService
 * when an order's payment is completed. They're part of the ledger and
 * editing them would diverge from the order history. The API enforces
 * this; the UI surfaces a banner and renders read-only fields.
 */
const ImmutableBanner = () => {
  const record = useRecordContext<Transaction>();
  if (!record?.orderId) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Alert severity="info">
        Cette transaction est liée à la commande{' '}
        <strong>{record.order?.orderNumber ?? record.orderId}</strong>. Elle a
        été générée automatiquement à l'encaissement du paiement et ne peut pas
        être modifiée.
      </Alert>
    </Box>
  );
};

const ReadOnlyView = () => {
  const record = useRecordContext<Transaction>();
  if (!record?.orderId) return null;
  return (
    <>
      <Labeled label="resources.transactions.fields.type">
        <TextField source="type" />
      </Labeled>
      <Labeled label="resources.transactions.fields.category">
        <TextField source="category" />
      </Labeled>
      <Labeled label="resources.transactions.fields.amount">
        <TextField source="amount" />
      </Labeled>
      <Labeled label="resources.transactions.fields.date">
        <TextField source="date" />
      </Labeled>
      <Labeled label="resources.transactions.fields.description">
        <TextField source="description" />
      </Labeled>
    </>
  );
};

const EditableView = () => {
  const record = useRecordContext<Transaction>();
  if (record?.orderId) return null;
  return (
    <>
      <SelectInput
        source="type"
        choices={TYPES.map((t) => ({ id: t, name: t }))}
        validate={[required()]}
      />
      <SelectInput
        source="category"
        choices={CATEGORIES.map((c) => ({ id: c, name: c }))}
        validate={[required()]}
      />
      <NumberInput
        source="amount"
        validate={[required(), minValue(0.01)]}
      />
      <DateTimeInput source="date" />
      <TextInput source="description" multiline minRows={2} fullWidth />
      <TextInput
        source="receiptUrl"
        helperText="resources.transactions.helpers.receipt"
        fullWidth
      />
    </>
  );
};

export const TransactionEdit = () => (
  <Edit mutationMode="pessimistic">
    <SimpleForm>
      <ImmutableBanner />
      <EditableView />
      <ReadOnlyView />
    </SimpleForm>
  </Edit>
);
