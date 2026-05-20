export const APP_SOURCE = {
  WEB_STORE: 'WEB_STORE',
  WEB_ADMIN: 'WEB_ADMIN',
  WEB_DELIVERY: 'WEB_DELIVERY',
  MOBILE_STORE: 'MOBILE_STORE',
  MOBILE_STUDIO: 'MOBILE_STUDIO',
  MOBILE_DELIVERY: 'MOBILE_DELIVERY',
  MOBILE_RESELLER: 'MOBILE_RESELLER',
  API: 'API',
} as const;
export type AppSource = (typeof APP_SOURCE)[keyof typeof APP_SOURCE];

export const USER_ROLE = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  DELIVERER: 'DELIVERER',
  CLIENT: 'CLIENT',
  SALES_REP: 'SALES_REP',
} as const;
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const PRODUCTION_TYPE = {
  INTERNAL: 'INTERNAL',
  SUBCONTRACTED: 'SUBCONTRACTED',
  PURCHASED: 'PURCHASED',
} as const;
export type ProductionType = (typeof PRODUCTION_TYPE)[keyof typeof PRODUCTION_TYPE];

export const COMMISSION_TYPE = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const;
export type CommissionType = (typeof COMMISSION_TYPE)[keyof typeof COMMISSION_TYPE];

export const RAW_MATERIAL_TYPE = {
  FABRIC: 'FABRIC',
  ACCESSORY: 'ACCESSORY',
  PACKAGING: 'PACKAGING',
  OTHER: 'OTHER',
} as const;
export type RawMaterialType = (typeof RAW_MATERIAL_TYPE)[keyof typeof RAW_MATERIAL_TYPE];

export const PURCHASE_ORDER_STATUS = {
  DRAFT: 'DRAFT',
  ORDERED: 'ORDERED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;
export type PurchaseOrderStatus =
  (typeof PURCHASE_ORDER_STATUS)[keyof typeof PURCHASE_ORDER_STATUS];

export const PURCHASE_ORDER_COST_TYPE = {
  TRANSPORT: 'TRANSPORT',
  CUSTOMS: 'CUSTOMS',
  BUYER_COMMISSION: 'BUYER_COMMISSION',
  INSURANCE: 'INSURANCE',
  OTHER: 'OTHER',
} as const;
export type PurchaseOrderCostType =
  (typeof PURCHASE_ORDER_COST_TYPE)[keyof typeof PURCHASE_ORDER_COST_TYPE];

export const PRODUCTION_ORDER_TYPE = {
  INTERNAL: 'INTERNAL',
  SUBCONTRACTED: 'SUBCONTRACTED',
} as const;
export type ProductionOrderType =
  (typeof PRODUCTION_ORDER_TYPE)[keyof typeof PRODUCTION_ORDER_TYPE];

export const PRODUCTION_ORDER_STATUS = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type ProductionOrderStatus =
  (typeof PRODUCTION_ORDER_STATUS)[keyof typeof PRODUCTION_ORDER_STATUS];

export const PRODUCTION_STAGE_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;
export type ProductionStageStatus =
  (typeof PRODUCTION_STAGE_STATUS)[keyof typeof PRODUCTION_STAGE_STATUS];

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_CHANNEL = {
  WEBSITE: 'WEBSITE',
  WHATSAPP: 'WHATSAPP',
  FACEBOOK: 'FACEBOOK',
  INSTAGRAM: 'INSTAGRAM',
  TIKTOK: 'TIKTOK',
  IN_PERSON: 'IN_PERSON',
} as const;
export type OrderChannel = (typeof ORDER_CHANNEL)[keyof typeof ORDER_CHANNEL];

export const PAYMENT_METHOD = {
  ORANGE_MONEY: 'ORANGE_MONEY',
  MTN_MOMO: 'MTN_MOMO',
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY',
} as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const DELIVERY_STATUS = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
} as const;
export type DeliveryStatus = (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

export const DELIVERY_MODE = {
  HOME_DELIVERY: 'HOME_DELIVERY',
  STAFF_DELIVERY: 'STAFF_DELIVERY',
  STORE_PICKUP: 'STORE_PICKUP',
  RELAY_PICKUP: 'RELAY_PICKUP',
} as const;
export type DeliveryMode = (typeof DELIVERY_MODE)[keyof typeof DELIVERY_MODE];

export const CONSIGNMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  RECONCILED: 'RECONCILED',
  CANCELLED: 'CANCELLED',
} as const;
export type ConsignmentStatus = (typeof CONSIGNMENT_STATUS)[keyof typeof CONSIGNMENT_STATUS];

export const SALES_COMMISSION_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
} as const;
export type SalesCommissionStatus =
  (typeof SALES_COMMISSION_STATUS)[keyof typeof SALES_COMMISSION_STATUS];

export const TRANSACTION_TYPE = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;
export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

export const TRANSACTION_CATEGORY = {
  SALE: 'SALE',
  RAW_MATERIALS: 'RAW_MATERIALS',
  SUBCONTRACTING: 'SUBCONTRACTING',
  MARKETING: 'MARKETING',
  TRANSPORT: 'TRANSPORT',
  CUSTOMS: 'CUSTOMS',
  SALARY: 'SALARY',
  RENT: 'RENT',
  EQUIPMENT: 'EQUIPMENT',
  PACKAGING: 'PACKAGING',
  DELIVERY: 'DELIVERY',
  COMMISSION: 'COMMISSION',
  OTHER: 'OTHER',
} as const;
export type TransactionCategory =
  (typeof TRANSACTION_CATEGORY)[keyof typeof TRANSACTION_CATEGORY];

export const ARTICLE_CATEGORY = {
  STYLE: 'STYLE',
  BEHIND_THE_SCENES: 'BEHIND_THE_SCENES',
  EVENTS: 'EVENTS',
  GUIDES: 'GUIDES',
} as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORY)[keyof typeof ARTICLE_CATEGORY];

export const PROMO_CODE_TYPE = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const;
export type PromoCodeType = (typeof PROMO_CODE_TYPE)[keyof typeof PROMO_CODE_TYPE];

export const NOTIFICATION_CHANNEL = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
} as const;
export type NotificationChannel =
  (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL];

export const STOCK_MOVEMENT_TYPE = {
  PRODUCTION_IN: 'PRODUCTION_IN',
  PURCHASE_IN: 'PURCHASE_IN',
  SALE_OUT: 'SALE_OUT',
  CONSIGNMENT_OUT: 'CONSIGNMENT_OUT',
  CONSIGNMENT_RETURN: 'CONSIGNMENT_RETURN',
  CANCELLATION_RETURN: 'CANCELLATION_RETURN',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
} as const;
export type StockMovementType =
  (typeof STOCK_MOVEMENT_TYPE)[keyof typeof STOCK_MOVEMENT_TYPE];
