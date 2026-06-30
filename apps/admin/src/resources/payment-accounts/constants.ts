import type { PaymentAccountType } from '../../types';

export const PAYMENT_ACCOUNT_TYPES: PaymentAccountType[] = [
  'CASH',
  'ORANGE_MONEY',
  'MTN_MOMO',
  'BANK',
];

export const typeChoices = PAYMENT_ACCOUNT_TYPES.map((id) => ({ id, name: id }));

/**
 * Encashment identifiers (phone / account numbers) are sensitive — show only
 * the last 4 digits in lists and balances. The full value stays editable on
 * the account's edit form.
 */
export const maskIdentifier = (identifier?: string | null): string => {
  if (!identifier) return '—';
  const trimmed = identifier.trim();
  if (trimmed.length <= 4) return trimmed;
  return `•••${trimmed.slice(-4)}`;
};
