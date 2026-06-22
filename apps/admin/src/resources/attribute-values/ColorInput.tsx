import { useInput, useTranslate, regex } from 'react-admin';
import { Box, IconButton, TextField } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const validateHex = regex(HEX_RE, 'resources.attribute-values.helpers.color_hex_invalid');

/**
 * Optional hex colour input: a native colour picker swatch next to an editable
 * hex field, with a clear button. Used for colour attribute values so the
 * storefront can render a real swatch. Empty is valid (non-colour values).
 */
export const ColorInput = ({ source, label }: { source: string; label: string }) => {
  const translate = useTranslate();
  const { field, fieldState } = useInput({ source, validate: validateHex });

  const value: string = field.value ?? '';
  const swatch = HEX_RE.test(value) ? value : '#ffffff';

  return (
    <Box sx={{ my: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <input
          type="color"
          aria-label={label}
          value={swatch}
          onChange={(e) => field.onChange(e.target.value)}
          style={{
            width: 44,
            height: 44,
            padding: 0,
            border: '1px solid rgba(0,0,0,0.23)',
            borderRadius: 6,
            background: 'none',
            cursor: 'pointer',
          }}
        />
        <TextField
          label={label}
          value={value}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          placeholder="#C4836B"
          size="small"
          error={!!fieldState.error}
          helperText={
            fieldState.error
              ? translate(fieldState.error.message ?? '')
              : translate('resources.attribute-values.helpers.color_hex')
          }
        />
        {value ? (
          <IconButton
            aria-label={translate('ra.action.clear_input_value')}
            onClick={() => field.onChange('')}
            size="small"
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Box>
    </Box>
  );
};
