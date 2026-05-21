import { useState } from 'react';
import {
  BooleanInput,
  Button,
  Edit,
  Labeled,
  NumberInput,
  ReferenceField,
  SimpleForm,
  TextField,
  TextInput,
  TopToolbar,
  minValue,
  regex,
  required,
  useNotify,
  useRecordContext,
  useRefresh,
  useTranslate,
} from 'react-admin';
import TuneIcon from '@mui/icons-material/Tune';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField as MuiTextField,
  Button as MuiButton,
} from '@mui/material';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

const AdjustStockButton = () => {
  const record = useRecordContext<{ id: string; sku: string; stock: number }>();
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');

  if (!record) return null;

  const handleSubmit = async () => {
    try {
      await fetchJson(`${API_BASE}/variants/${record.id}/adjust-stock`, {
        method: 'POST',
        body: JSON.stringify({ quantity, reason }),
      });
      notify('resources.variants.notifications.stock_adjusted', { type: 'success' });
      setOpen(false);
      setQuantity(0);
      setReason('');
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : translate('ra.notification.http_error'), {
        type: 'error',
      });
    }
  };

  return (
    <>
      <Button
        label="resources.variants.actions.adjust_stock"
        onClick={() => setOpen(true)}
        startIcon={<TuneIcon />}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{translate('resources.variants.actions.adjust_stock')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <p style={{ margin: 0 }}>
              SKU <code>{record.sku}</code> — {translate('resources.variants.fields.stock')}:{' '}
              <strong>{record.stock}</strong>
            </p>
            <MuiTextField
              label={translate('resources.variants.dialogs.delta')}
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              fullWidth
              autoFocus
            />
            <MuiTextField
              label={translate('resources.variants.dialogs.reason')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
              required
              multiline
              minRows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>
            {translate('ra.action.cancel')}
          </MuiButton>
          <MuiButton
            variant="contained"
            disabled={quantity === 0 || reason.trim().length < 3}
            onClick={handleSubmit}
          >
            {translate('ra.action.confirm')}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

const Actions = () => (
  <TopToolbar>
    <AdjustStockButton />
  </TopToolbar>
);

export const VariantEdit = () => {
  const translate = useTranslate();
  return (
    <Edit mutationMode="pessimistic" actions={<Actions />}>
      <SimpleForm>
        <Labeled label="resources.variants.fields.productId">
          <ReferenceField source="productId" reference="products" link="edit">
            <TextField source="slug" />
          </ReferenceField>
        </Labeled>
        <TextInput
          source="sku"
          validate={[
            required(),
            regex(/^[A-Z0-9][A-Z0-9._-]{1,49}$/, 'resources.variants.errors.invalid_sku'),
          ]}
          fullWidth
        />
        <Labeled label="resources.variants.fields.stock">
          <TextField source="stock" />
        </Labeled>
        <Labeled label="resources.variants.fields.consigned">
          <TextField source="consignedStock" />
        </Labeled>
        <NumberInput
          source="priceOverride"
          helperText="resources.variants.helpers.price_override"
          validate={[minValue(0)]}
        />
        <BooleanInput source="isActive" />
        <p style={{ opacity: 0.7, marginTop: 16, fontSize: 13 }}>
          {translate('resources.variants.helpers.stock_via_adjust')}
        </p>
      </SimpleForm>
    </Edit>
  );
};
