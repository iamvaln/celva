import type {
  OrderChannel,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '@celva/shared';

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

export type DeliveryZone = {
  id: string;
  name: { fr: string; en: string };
  fee: string | number;
  actualCost: string | number;
  freeDeliveryThreshold?: string | number | null;
  estimatedDays?: { min: number; max: number } | null;
  isActive: boolean;
};

export type PickupPoint = {
  id: string;
  name: { fr: string; en: string };
  address: string;
  city: string;
  phone?: string | null;
  hours?: { fr?: string; en?: string } | null;
  isActive: boolean;
};

export type Setting = {
  id: string;
  key: string;
  value: string;
  label?: { fr?: string; en?: string } | null;
};

export type Category = {
  id: string;
  slug: string;
  name: { fr: string; en: string };
  description?: { fr?: string; en?: string } | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Collection = {
  id: string;
  slug: string;
  name: { fr: string; en: string };
  description?: { fr?: string; en?: string } | null;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductAttribute = {
  id: string;
  name: { fr: string; en: string };
  sortOrder: number;
  productId: string;
};

export type ProductAttributeValue = {
  id: string;
  value: { fr: string; en: string };
  sortOrder: number;
  attributeId: string;
};

export type ProductVariant = {
  id: string;
  sku: string;
  stock: number;
  consignedStock: number;
  priceOverride?: string | number | null;
  isActive: boolean;
  productId: string;
  attributeValues: Array<{ attributeId: string; attributeValueId: string }>;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  slug: string;
  name: { fr: string; en: string };
  description?: { fr?: string; en?: string } | null;
  displayPrice: string | number;
  floorPrice: string | number;
  costPrice: string | number;
  productionType: 'INTERNAL' | 'SUBCONTRACTED' | 'PURCHASED';
  defaultCommissionType: 'PERCENTAGE' | 'FIXED';
  defaultCommissionValue: string | number;
  isActive: boolean;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
};

export type StockMovement = {
  id: string;
  type:
    | 'PRODUCTION_IN'
    | 'PURCHASE_IN'
    | 'SALE_OUT'
    | 'CONSIGNMENT_OUT'
    | 'CONSIGNMENT_RETURN'
    | 'CANCELLATION_RETURN'
    | 'MANUAL_ADJUSTMENT';
  quantity: number;
  reason: string | null;
  createdAt: string;
  variantId: string;
  variant: {
    id: string;
    sku: string;
    product: { id: string; slug: string; name: { fr: string; en: string } };
  };
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  orderId: string | null;
  orderItemId: string | null;
  productionOrderId: string | null;
  consignmentId: string | null;
};

export type SalesCommission = {
  id: string;
  amount: string | number;
  status: 'PENDING' | 'PAID';
  paidAt: string | null;
  orderId: string;
  orderItemId: string;
  salesRepId: string;
  order: { id: string; orderNumber: string; status: string; total: string | number };
  orderItem: {
    id: string;
    quantity: number;
    unitPrice: string | number;
    variant: {
      sku: string;
      product: { id: string; slug: string; name: { fr: string; en: string } };
    };
  };
  salesRep: { id: string; name: string; email: string };
};

export type Transaction = {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category:
    | 'SALE'
    | 'RAW_MATERIALS'
    | 'SUBCONTRACTING'
    | 'MARKETING'
    | 'TRANSPORT'
    | 'CUSTOMS'
    | 'SALARY'
    | 'RENT'
    | 'EQUIPMENT'
    | 'PACKAGING'
    | 'DELIVERY'
    | 'COMMISSION'
    | 'OTHER';
  amount: string | number;
  description: string | null;
  receiptUrl: string | null;
  date: string;
  createdAt: string;
  orderId: string | null;
  order?: { id: string; orderNumber: string } | null;
  createdById: string;
  createdBy?: { id: string; name: string; email: string };
};

export type Delivery = {
  id: string;
  mode: 'HOME_DELIVERY' | 'STAFF_DELIVERY' | 'STORE_PICKUP' | 'RELAY_PICKUP';
  status:
    | 'PENDING'
    | 'ASSIGNED'
    | 'PICKED_UP'
    | 'IN_TRANSIT'
    | 'DELIVERED'
    | 'FAILED';
  actualCost: string | number;
  trackingNote: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total: string | number;
    shippingAddress: string | null;
    shippingCity: string | null;
    shippingPhone: string | null;
    notes: string | null;
    user: { id: string; email: string; name: string; phone: string | null };
  };
  pickupPoint?: {
    id: string;
    name: { fr: string; en: string };
    address: string;
    city: string;
  } | null;
};

export type Article = {
  id: string;
  title: { fr: string; en: string };
  slug: string;
  content: { fr: string; en: string };
  excerpt: { fr?: string; en?: string } | null;
  coverImage: string | null;
  category: 'STYLE' | 'BEHIND_THE_SCENES' | 'EVENTS' | 'GUIDES';
  isPublished: boolean;
  publishedAt: string | null;
  authorId: string;
  author?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

export type AuthLoginResponse = {
  accessToken: string;
  user: AdminUser;
};

export type ApiEnvelope<T> = {
  data: T;
  requestId?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  channel: OrderChannel;
  subtotal: string | number;
  deliveryFee: string | number;
  discount?: string | number | null;
  total: string | number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; name: string };
  items: Array<{ id: string }>;
  payment: { method: PaymentMethod; status: PaymentStatus } | null;
};

export type AdminOrderDetail = Omit<AdminOrderRow, 'user' | 'items' | 'payment'> & {
  user: { id: string; email: string; name: string; phone?: string | null };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string | number;
    lineTotal: string | number;
    variantId: string;
    variant: {
      id: string;
      sku: string;
      product: { id: string; slug: string; name: { fr: string; en: string } };
    };
  }>;
  payment: {
    id: string;
    method: PaymentMethod;
    status: PaymentStatus;
    phoneNumber?: string | null;
    transactionRef?: string | null;
    paidAt?: string | null;
  } | null;
  delivery: {
    id: string;
    mode: 'HOME_DELIVERY' | 'STORE_PICKUP';
    fee: string | number;
    shippingAddress?: string | null;
    shippingCity?: string | null;
    shippingPhone?: string | null;
    deliveryZoneId?: string | null;
    pickupPointId?: string | null;
    pickupPoint?: { id: string; name: { fr: string; en: string } } | null;
  } | null;
  promoCode?: { id: string; code: string } | null;
};
