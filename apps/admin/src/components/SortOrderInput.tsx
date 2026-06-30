import { NumberInput, type NumberInputProps } from 'react-admin';

/**
 * Display-order field shared by every resource that exposes `sortOrder`.
 * Wraps React-Admin's <NumberInput> with sensible defaults: a translated
 * helper string explaining what the order controls and a `min={0}` floor.
 * Callers may override any prop (helperText, validate, defaultValue, min…).
 */
export const SortOrderInput = ({
  source = 'sortOrder',
  helperText = 'shared.helpers.sort_order',
  min = 0,
  ...props
}: Omit<NumberInputProps, 'source'> & { source?: string }) => (
  <NumberInput source={source} helperText={helperText} min={min} {...props} />
);
