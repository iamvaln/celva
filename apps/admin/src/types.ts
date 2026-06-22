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
  /** When true, the user must change their password before doing anything else. */
  mustChangePassword?: boolean;
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

export type PaymentAccountType = 'CASH' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'BANK';

export type PaymentAccount = {
  id: string;
  name: string;
  type: PaymentAccountType;
  identifier?: string | null;
  isActive: boolean;
  createdAt?: string;
};

export type PaymentAccountBalance = PaymentAccount & {
  income: string;
  expense: string;
  balance: string;
};

export type AdminPayment = {
  id: string;
  method: 'ORANGE_MONEY' | 'MTN_MOMO' | 'CASH_ON_DELIVERY';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  amount: string | number;
  transactionRef?: string | null;
  phoneNumber?: string | null;
  paidAt?: string | null;
  createdAt: string;
  orderId: string;
  order?: { orderNumber: string; user?: { name: string } | null } | null;
  paymentAccountId?: string | null;
  paymentAccount?: { name: string } | null;
};

export type AdminInvoice = {
  id: string;
  invoiceNumber: string;
  totalHT: string | number;
  totalTVA: string | number;
  totalTTC: string | number;
  pdfKey?: string | null;
  sentAt?: string | null;
  createdAt: string;
  orderId: string;
  order?: { orderNumber: string; user?: { name: string } | null } | null;
};

export type Category = {
  id: string;
  slug: string;
  name: { fr: string; en: string };
  description?: { fr?: string; en?: string } | null;
  sortOrder: number;
  productCount?: number;
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
  productCount?: number;
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
  storageLocation?: string | null;
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

export type ProductionOrder = {
  id: string;
  type: 'INTERNAL' | 'SUBCONTRACTED';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  quantity: number;
  laborCost: string | number;
  subcontractCost: string | number;
  subcontractorName: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  productId: string;
  product?: { id: string; slug: string; name: { fr: string; en: string }; costPrice: string | number };
  materialConsumptions: Array<{
    id: string;
    quantityUsed: string | number;
    rawMaterialId: string;
    rawMaterial: { id: string; name: string; unit: string; unitPrice: string | number };
  }>;
  stages: Array<{
    id: string;
    name: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    sortOrder: number;
    completedAt: string | null;
  }>;
};

export type PurchaseOrder = {
  id: string;
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  totalAmount: string | number;
  notes: string | null;
  createdAt: string;
  supplierId: string;
  supplier?: { id: string; name: string };
  createdBy?: { id: string; name: string; email: string };
  items: Array<{
    id: string;
    quantity: string | number;
    unitPrice: string | number;
    quantityReceived: string | number;
    rawMaterialId: string;
    rawMaterial: { id: string; name: string; unit: string };
  }>;
  costs: Array<{
    id: string;
    type: 'TRANSPORT' | 'CUSTOMS' | 'BUYER_COMMISSION' | 'INSURANCE' | 'OTHER';
    amount: string | number;
    description: string | null;
  }>;
};

export type RawMaterial = {
  id: string;
  name: string;
  type: 'FABRIC' | 'ACCESSORY' | 'PACKAGING' | 'OTHER';
  unit: string;
  unitPrice: string | number;
  stockQty: string | number;
  alertThreshold: string | number | null;
  imageKey: string | null;
  isLowStock: boolean;
  supplierId: string;
  supplier?: { id: string; name: string };
};

export type Consignment = {
  id: string;
  status: 'ACTIVE' | 'RECONCILED' | 'CANCELLED';
  notes: string | null;
  releasedAt: string;
  reconciledAt: string | null;
  salesRepId: string;
  salesRep: { id: string; name: string; email: string };
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  items: Array<{
    id: string;
    quantityTaken: number;
    quantitySold: number;
    quantityReturned: number;
    variantId: string;
    variant: {
      id: string;
      sku: string;
      priceOverride: string | number | null;
      product: {
        id: string;
        slug: string;
        name: { fr: string; en: string };
        displayPrice: string | number;
      };
    };
  }>;
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
  receiptUrl: string | null;
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

export type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  appSource: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  userId: string;
  user?: { id: string; name: string; email: string };
};

export type SizeGuide = {
  id: string;
  name: { fr: string; en: string };
  content: { fr: string; en: string };
  categoryId: string;
  category?: { id: string; slug: string; name: { fr: string; en: string } };
};

export type StudioBilingual = { fr: string; en: string };

export type StudioModelAngle = 'FRONT' | 'SIDE' | 'BACK' | 'DETAIL';

export type StudioFabricFamily = {
  id: string;
  slug: string;
  name: StudioBilingual;
  description?: { fr?: string; en?: string } | null;
  coverImage: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  fabrics?: StudioFabric[];
  garments?: StudioGarment[];
};

export type StudioFabric = {
  id: string;
  familyId: string;
  family?: { id: string; slug: string; name: StudioBilingual };
  name: StudioBilingual;
  swatchImage: string | null;
  photoImage: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StudioGarment = {
  id: string;
  familyId: string;
  family?: { id: string; slug: string; name: StudioBilingual };
  name: StudioBilingual;
  description?: { fr?: string; en?: string } | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  photos?: StudioModel[];
};

// StudioModel is now a single photo of a garment (V2 schema).
export type StudioModel = {
  id: string;
  garmentId: string;
  garment?: { id: string; name: StudioBilingual; family?: { id: string; slug: string; name: StudioBilingual } };
  imageKey: string;
  caption?: { fr?: string; en?: string } | null;
  angle: StudioModelAngle | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StudioRequestType = 'ORDER' | 'APPOINTMENT';
export type StudioRequestStatus =
  | 'PENDING'
  | 'CONTACTED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'REJECTED';

export type StudioRequestFabricSelection = {
  fabricId: string;
  sortOrder: number;
  fabric: {
    id: string;
    name: StudioBilingual;
    swatchImage: string | null;
    photoImage: string | null;
    family: { id: string; slug: string; name: StudioBilingual };
  };
};

export type StudioRequest = {
  id: string;
  type: StudioRequestType;
  status: StudioRequestStatus;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  customerCity: string | null;
  appointmentMode: 'ATELIER' | 'VISIO' | null;
  appointmentDate: string | null;
  appointmentSlot: string | null;
  notes: string | null;
  internalNotes: string | null;
  appSource: string;
  createdAt: string;
  updatedAt: string;
  selectedFabrics: StudioRequestFabricSelection[];
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt: string | null;
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
  taxAmount?: string | number | null;
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
      storageLocation?: string | null;
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
