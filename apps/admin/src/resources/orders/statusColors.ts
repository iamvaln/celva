import type { OrderStatus, PaymentStatus } from '@celva/shared';

export const ORDER_STATUS_COLOR: Record<OrderStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  READY: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, 'default' | 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  FAILED: 'error',
  REFUNDED: 'default',
};
