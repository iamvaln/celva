import type { Delivery } from '../../types';

export const DELIVERY_STATUS_COLOR: Record<
  Delivery['status'],
  'default' | 'info' | 'success' | 'warning' | 'error'
> = {
  PENDING: 'warning',
  ASSIGNED: 'info',
  PICKED_UP: 'info',
  IN_TRANSIT: 'info',
  DELIVERED: 'success',
  FAILED: 'error',
};
