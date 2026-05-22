# Celva Store — Schema Prisma v4 (Final)

## Changements depuis v3
- Champs traduisibles en Json (FR/EN) sur les entités client-facing
- Modèle Invoice (reçu/facture avec numéro séquentiel)
- Modèle StockMovement (traçabilité de chaque mouvement de stock)
- Relation RelatedProduct (cross-sell "Complétez le look")
- imageKey sur RawMaterial
- taxRate sur OrderItem (gel de la TVA au moment de la commande)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum AppSource {
  WEB_STORE
  WEB_ADMIN
  WEB_DELIVERY
  MOBILE_STORE
  MOBILE_STUDIO
  MOBILE_DELIVERY
  MOBILE_RESELLER
  API
}

enum UserRole {
  ADMIN
  MANAGER
  DELIVERER
  CLIENT
  SALES_REP
}

enum ProductionType {
  INTERNAL
  SUBCONTRACTED
  PURCHASED
}

enum CommissionType {
  PERCENTAGE
  FIXED
}

enum RawMaterialType {
  FABRIC
  ACCESSORY
  PACKAGING
  OTHER
}

enum PurchaseOrderStatus {
  DRAFT
  ORDERED
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}

enum PurchaseOrderCostType {
  TRANSPORT
  CUSTOMS
  BUYER_COMMISSION
  INSURANCE
  OTHER
}

enum ProductionOrderType {
  INTERNAL
  SUBCONTRACTED
}

enum ProductionOrderStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum ProductionStageStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  READY
  SHIPPED
  DELIVERED
  COMPLETED
  CANCELLED
}

enum OrderChannel {
  WEBSITE
  WHATSAPP
  FACEBOOK
  INSTAGRAM
  TIKTOK
  IN_PERSON
}

enum PaymentMethod {
  ORANGE_MONEY
  MTN_MOMO
  CASH_ON_DELIVERY
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum DeliveryStatus {
  PENDING
  ASSIGNED
  PICKED_UP
  IN_TRANSIT
  DELIVERED
  FAILED
}

enum DeliveryMode {
  HOME_DELIVERY
  STAFF_DELIVERY
  STORE_PICKUP
  RELAY_PICKUP
}

enum ConsignmentStatus {
  ACTIVE
  RECONCILED
  CANCELLED
}

enum SalesCommissionStatus {
  PENDING
  PAID
}

enum TransactionType {
  INCOME
  EXPENSE
}

enum TransactionCategory {
  SALE
  RAW_MATERIALS
  SUBCONTRACTING
  MARKETING
  TRANSPORT
  CUSTOMS
  SALARY
  RENT
  EQUIPMENT
  PACKAGING
  DELIVERY
  COMMISSION
  OTHER
}

enum ArticleCategory {
  STYLE
  BEHIND_THE_SCENES
  EVENTS
  GUIDES
}

enum PromoCodeType {
  PERCENTAGE
  FIXED
}

enum NotificationChannel {
  IN_APP
  EMAIL
  SMS
}

enum StockMovementType {
  PRODUCTION_IN
  PURCHASE_IN
  SALE_OUT
  CONSIGNMENT_OUT
  CONSIGNMENT_RETURN
  CANCELLATION_RETURN
  MANUAL_ADJUSTMENT
}

// ─────────────────────────────────────────────
// AUTH & USERS
// ─────────────────────────────────────────────

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  phone        String?
  role         UserRole @default(CLIENT)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  cart              Cart?
  orders            Order[]            @relation("ClientOrders")
  addresses         Address[]
  savedPayments     SavedPaymentMethod[]
  wishlistItems     WishlistItem[]
  notifications     Notification[]

  sales             Order[]            @relation("SalesRepOrders")
  commissionRules   CommissionRule[]
  commissions       SalesCommission[]
  consignments      Consignment[]      @relation("SalesRepConsignments")

  deliveries        Delivery[]

  articles            Article[]
  purchaseOrders      PurchaseOrder[]
  productionOrders    ProductionOrder[]
  transactions        Transaction[]
  createdConsignments Consignment[]    @relation("CreatedConsignments")
  auditLogs           AuditLog[]
  stockMovements      StockMovement[]

  @@map("users")
}

model Address {
  id        String  @id @default(uuid())
  label     String
  fullName  String
  phone     String
  line1     String
  line2     String?
  city      String
  zone      String?
  country   String  @default("CM")
  isDefault Boolean @default(false)

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("addresses")
}

model SavedPaymentMethod {
  id          String        @id @default(uuid())
  method      PaymentMethod
  label       String
  phoneNumber String
  isDefault   Boolean       @default(false)
  createdAt   DateTime      @default(now())

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("saved_payment_methods")
}

// ─────────────────────────────────────────────
// CATALOGUE
// ─────────────────────────────────────────────

model Category {
  id          String @id @default(uuid())
  name        Json   // { "fr": "Robes", "en": "Dresses" }
  slug        String @unique
  description Json?  // { "fr": "...", "en": "..." }
  sortOrder   Int    @default(0)

  products   Product[]
  sizeGuides SizeGuide[]

  @@map("categories")
}

model Product {
  id                     String         @id @default(uuid())
  name                   Json           // { "fr": "Robe Amara", "en": "Amara Dress" }
  slug                   String         @unique
  description            Json?          // { "fr": "...", "en": "..." }
  displayPrice           Decimal        @db.Decimal(10, 2) // TTC
  floorPrice             Decimal        @db.Decimal(10, 2) // TTC
  costPrice              Decimal        @default(0) @db.Decimal(10, 2) // HT (coût de revient)
  productionType         ProductionType
  defaultCommissionType  CommissionType @default(PERCENTAGE)
  defaultCommissionValue Decimal        @default(0) @db.Decimal(10, 2)
  isActive               Boolean        @default(true)
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt

  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])

  variants         ProductVariant[]
  images           ProductImage[]
  collections      ProductCollection[]
  productionOrders ProductionOrder[]
  commissionRules  CommissionRule[]
  attributes       ProductAttribute[]

  // Cross-sell
  relatedTo   RelatedProduct[] @relation("ProductRelatedTo")
  relatedFrom RelatedProduct[] @relation("ProductRelatedFrom")

  @@map("products")
}

model RelatedProduct {
  productId        String
  relatedProductId String
  sortOrder        Int    @default(0)

  product        Product @relation("ProductRelatedTo", fields: [productId], references: [id], onDelete: Cascade)
  relatedProduct Product @relation("ProductRelatedFrom", fields: [relatedProductId], references: [id], onDelete: Cascade)

  @@id([productId, relatedProductId])
  @@map("related_products")
}

// ─── Attributs flexibles ───

model ProductAttribute {
  id        String @id @default(uuid())
  name      Json   // { "fr": "Taille", "en": "Size" }
  sortOrder Int    @default(0)

  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  values        ProductAttributeValue[]
  variantValues VariantAttributeValue[]

  @@unique([productId, sortOrder])
  @@map("product_attributes")
}

model ProductAttributeValue {
  id        String @id @default(uuid())
  value     Json   // { "fr": "Noir", "en": "Black" } ou { "fr": "M", "en": "M" }
  sortOrder Int    @default(0)

  attributeId String
  attribute   ProductAttribute @relation(fields: [attributeId], references: [id], onDelete: Cascade)

  variantValues VariantAttributeValue[]

  @@unique([attributeId, sortOrder])
  @@map("product_attribute_values")
}

// ─── Variantes ───

model ProductVariant {
  id             String   @id @default(uuid())
  sku            String   @unique
  stock          Int      @default(0)
  consignedStock Int      @default(0)
  priceOverride  Decimal? @db.Decimal(10, 2) // TTC
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  productId String
  product   Product @relation(fields: [productId], references: [id])

  attributeValues  VariantAttributeValue[]
  cartItems        CartItem[]
  orderItems       OrderItem[]
  wishlistItems    WishlistItem[]
  consignmentItems ConsignmentItem[]
  stockMovements   StockMovement[]

  @@map("product_variants")
}

model VariantAttributeValue {
  variantId        String
  variant          ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)

  attributeId      String
  attribute        ProductAttribute @relation(fields: [attributeId], references: [id])

  attributeValueId String
  attributeValue   ProductAttributeValue @relation(fields: [attributeValueId], references: [id])

  @@id([variantId, attributeId])
  @@map("variant_attribute_values")
}

// ─── Images ───

model ProductImage {
  id        String  @id @default(uuid())
  key       String
  altText   Json?   // { "fr": "...", "en": "..." }
  position  Int     @default(0)
  isPrimary Boolean @default(false)

  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_images")
}

// ─── Collections ───

model Collection {
  id          String   @id @default(uuid())
  name        Json     // { "fr": "Collection Noël", "en": "Christmas Collection" }
  slug        String   @unique
  description Json?    // { "fr": "...", "en": "..." }
  imageUrl    String?
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  products ProductCollection[]

  @@map("collections")
}

model ProductCollection {
  productId    String
  collectionId String
  sortOrder    Int    @default(0)

  product    Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  collection Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  @@id([productId, collectionId])
  @@map("product_collections")
}

// ─────────────────────────────────────────────
// WISHLIST
// ─────────────────────────────────────────────

model WishlistItem {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())

  userId    String
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  variantId String
  variant   ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@unique([userId, variantId])
  @@map("wishlist_items")
}

// ─────────────────────────────────────────────
// APPROVISIONNEMENT
// ─────────────────────────────────────────────

model Supplier {
  id      String  @id @default(uuid())
  name    String
  contact String?
  phone   String?
  email   String?
  address String?

  rawMaterials   RawMaterial[]
  purchaseOrders PurchaseOrder[]

  @@map("suppliers")
}

model RawMaterial {
  id             String          @id @default(uuid())
  name           String
  type           RawMaterialType
  unit           String
  unitPrice      Decimal         @db.Decimal(10, 2)
  stockQty       Decimal         @default(0) @db.Decimal(10, 2)
  alertThreshold Decimal?        @db.Decimal(10, 2)
  imageKey       String?         // clé R2 pour l'image d'identification

  supplierId String
  supplier   Supplier @relation(fields: [supplierId], references: [id])

  purchaseOrderItems    PurchaseOrderItem[]
  materialConsumptions  MaterialConsumption[]
  packagingConsumptions PackagingConsumption[]

  @@map("raw_materials")
}

model PurchaseOrder {
  id          String              @id @default(uuid())
  status      PurchaseOrderStatus @default(DRAFT)
  totalAmount Decimal             @default(0) @db.Decimal(10, 2)
  notes       String?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  supplierId  String
  supplier    Supplier @relation(fields: [supplierId], references: [id])
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])

  items        PurchaseOrderItem[]
  costs        PurchaseOrderCost[]
  transactions Transaction[]

  @@map("purchase_orders")
}

model PurchaseOrderItem {
  id               String  @id @default(uuid())
  quantity         Decimal @db.Decimal(10, 2)
  unitPrice        Decimal @db.Decimal(10, 2)
  quantityReceived Decimal @default(0) @db.Decimal(10, 2)

  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  rawMaterialId   String
  rawMaterial     RawMaterial   @relation(fields: [rawMaterialId], references: [id])

  @@map("purchase_order_items")
}

model PurchaseOrderCost {
  id          String                @id @default(uuid())
  type        PurchaseOrderCostType
  amount      Decimal               @db.Decimal(10, 2)
  description String?

  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)

  @@map("purchase_order_costs")
}

// ─────────────────────────────────────────────
// PRODUCTION
// ─────────────────────────────────────────────

model ProductionOrder {
  id                String                @id @default(uuid())
  type              ProductionOrderType
  status            ProductionOrderStatus @default(PLANNED)
  quantity          Int
  laborCost         Decimal               @default(0) @db.Decimal(10, 2)
  subcontractCost   Decimal               @default(0) @db.Decimal(10, 2)
  subcontractorName String?
  notes             String?
  startDate         DateTime?
  endDate           DateTime?
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  productId   String
  product     Product @relation(fields: [productId], references: [id])
  createdById String
  createdBy   User    @relation(fields: [createdById], references: [id])

  materialConsumptions MaterialConsumption[]
  stages               ProductionStage[]
  transactions         Transaction[]

  @@map("production_orders")
}

model MaterialConsumption {
  id           String  @id @default(uuid())
  quantityUsed Decimal @db.Decimal(10, 2)

  productionOrderId String
  productionOrder   ProductionOrder @relation(fields: [productionOrderId], references: [id], onDelete: Cascade)
  rawMaterialId     String
  rawMaterial       RawMaterial     @relation(fields: [rawMaterialId], references: [id])

  @@map("material_consumptions")
}

model ProductionStage {
  id          String                @id @default(uuid())
  name        String
  status      ProductionStageStatus @default(PENDING)
  sortOrder   Int                   @default(0)
  completedAt DateTime?

  productionOrderId String
  productionOrder   ProductionOrder @relation(fields: [productionOrderId], references: [id], onDelete: Cascade)

  @@map("production_stages")
}

// ─────────────────────────────────────────────
// STOCK MOVEMENTS
// ─────────────────────────────────────────────

model StockMovement {
  id          String            @id @default(uuid())
  type        StockMovementType
  quantity    Int               // positif = entrée, négatif = sortie
  reason      String?
  createdAt   DateTime          @default(now())

  variantId         String
  variant           ProductVariant   @relation(fields: [variantId], references: [id])
  createdById       String
  createdBy         User             @relation(fields: [createdById], references: [id])

  // Références optionnelles vers la source du mouvement
  orderId           String?
  orderItemId       String?
  productionOrderId String?
  consignmentId     String?

  @@index([variantId])
  @@index([createdAt])
  @@map("stock_movements")
}

// ─────────────────────────────────────────────
// PANIER & COMMANDES
// ─────────────────────────────────────────────

model Cart {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userId String @unique
  user   User   @relation(fields: [userId], references: [id])

  items CartItem[]

  @@map("carts")
}

model CartItem {
  id       String @id @default(uuid())
  quantity Int    @default(1)

  cartId    String
  cart      Cart           @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variantId String
  variant   ProductVariant @relation(fields: [variantId], references: [id])

  @@unique([cartId, variantId])
  @@map("cart_items")
}

model Order {
  id              String       @id @default(uuid())
  orderNumber     String       @unique
  status          OrderStatus  @default(PENDING)
  channel         OrderChannel @default(WEBSITE)
  subtotal        Decimal      @db.Decimal(10, 2) // TTC
  deliveryFee     Decimal      @default(0) @db.Decimal(10, 2)
  discount        Decimal      @default(0) @db.Decimal(10, 2)
  total           Decimal      @db.Decimal(10, 2) // TTC
  taxAmount       Decimal      @default(0) @db.Decimal(10, 2) // TVA totale extraite
  shippingAddress String?
  shippingCity    String?
  shippingPhone   String?
  notes           String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  userId      String
  user        User       @relation("ClientOrders", fields: [userId], references: [id])
  salesRepId  String?
  salesRep    User?      @relation("SalesRepOrders", fields: [salesRepId], references: [id])
  promoCodeId String?
  promoCode   PromoCode? @relation(fields: [promoCodeId], references: [id])

  items        OrderItem[]
  payment      Payment?
  delivery     Delivery?
  invoice      Invoice?
  commissions  SalesCommission[]
  transactions Transaction[]

  @@map("orders")
}

model OrderItem {
  id        String  @id @default(uuid())
  quantity  Int
  unitPrice Decimal @db.Decimal(10, 2) // TTC, gelé au moment de la commande
  taxRate   Decimal @db.Decimal(5, 4)  // ex: 0.1925 (19.25%), gelé au moment de la commande

  orderId   String
  order     Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variantId String
  variant   ProductVariant @relation(fields: [variantId], references: [id])

  commission SalesCommission?

  @@map("order_items")
}

// ─────────────────────────────────────────────
// FACTURES / REÇUS
// ─────────────────────────────────────────────

model Invoice {
  id            String   @id @default(uuid())
  invoiceNumber String   @unique // CLV-INV-YYYYMM-0001
  totalHT       Decimal  @db.Decimal(10, 2)
  totalTVA      Decimal  @db.Decimal(10, 2)
  totalTTC      Decimal  @db.Decimal(10, 2)
  pdfKey        String?  // clé R2 du PDF généré
  sentAt        DateTime?
  createdAt     DateTime @default(now())

  orderId String @unique
  order   Order  @relation(fields: [orderId], references: [id])

  @@index([createdAt])
  @@map("invoices")
}

// ─────────────────────────────────────────────
// CODES PROMO
// ─────────────────────────────────────────────

model PromoCode {
  id              String        @id @default(uuid())
  code            String        @unique
  type            PromoCodeType
  value           Decimal       @db.Decimal(10, 2)
  minOrderAmount  Decimal?      @db.Decimal(10, 2)
  maxUses         Int?
  usedCount       Int           @default(0)
  maxUsesPerUser  Int?
  isActive        Boolean       @default(true)
  startsAt        DateTime?
  expiresAt       DateTime?
  createdAt       DateTime      @default(now())

  orders Order[]

  @@map("promo_codes")
}

// ─────────────────────────────────────────────
// PAIEMENTS
// ─────────────────────────────────────────────

model Payment {
  id             String        @id @default(uuid())
  method         PaymentMethod
  status         PaymentStatus @default(PENDING)
  amount         Decimal       @db.Decimal(10, 2)
  transactionRef String?
  phoneNumber    String?
  paidAt         DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  orderId String @unique
  order   Order  @relation(fields: [orderId], references: [id])

  @@map("payments")
}

// ─────────────────────────────────────────────
// LIVRAISON & PACKAGING
// ─────────────────────────────────────────────

model DeliveryZone {
  id                    String  @id @default(uuid())
  name                  Json    @unique // { "fr": "Douala", "en": "Douala" }
  fee                   Decimal @db.Decimal(10, 2)
  actualCost            Decimal @db.Decimal(10, 2)
  freeDeliveryThreshold Decimal? @db.Decimal(10, 2)
  estimatedDays         Json?   // { "fr": "1-2 jours", "en": "1-2 days" }
  isActive              Boolean @default(true)

  @@map("delivery_zones")
}

model PickupPoint {
  id       String  @id @default(uuid())
  name     Json    // { "fr": "Magasin Celva Douala", "en": "Celva Store Douala" }
  address  String
  city     String
  phone    String?
  hours    Json?   // { "fr": "Lun-Ven 9h-18h", "en": "Mon-Fri 9am-6pm" }
  isActive Boolean @default(true)

  deliveries Delivery[]

  @@map("pickup_points")
}

model Delivery {
  id           String         @id @default(uuid())
  mode         DeliveryMode   @default(HOME_DELIVERY)
  status       DeliveryStatus @default(PENDING)
  actualCost   Decimal        @default(0) @db.Decimal(10, 2)
  trackingNote String?
  assignedAt   DateTime?
  pickedUpAt   DateTime?
  deliveredAt  DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  orderId       String  @unique
  order         Order   @relation(fields: [orderId], references: [id])
  delivererId   String?
  deliverer     User?   @relation(fields: [delivererId], references: [id])
  pickupPointId String?
  pickupPoint   PickupPoint? @relation(fields: [pickupPointId], references: [id])

  packagingConsumptions PackagingConsumption[]

  @@map("deliveries")
}

model PackagingConsumption {
  id       String  @id @default(uuid())
  quantity Decimal @db.Decimal(10, 2)

  deliveryId    String
  delivery      Delivery    @relation(fields: [deliveryId], references: [id], onDelete: Cascade)
  rawMaterialId String
  rawMaterial   RawMaterial @relation(fields: [rawMaterialId], references: [id])

  @@map("packaging_consumptions")
}

// ─────────────────────────────────────────────
// CONSIGNATION
// ─────────────────────────────────────────────

model Consignment {
  id           String            @id @default(uuid())
  status       ConsignmentStatus @default(ACTIVE)
  notes        String?
  releasedAt   DateTime          @default(now())
  reconciledAt DateTime?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  salesRepId  String
  salesRep    User   @relation("SalesRepConsignments", fields: [salesRepId], references: [id])
  createdById String
  createdBy   User   @relation("CreatedConsignments", fields: [createdById], references: [id])

  items ConsignmentItem[]

  @@map("consignments")
}

model ConsignmentItem {
  id               String @id @default(uuid())
  quantityTaken    Int
  quantitySold     Int    @default(0)
  quantityReturned Int    @default(0)

  consignmentId String
  consignment   Consignment    @relation(fields: [consignmentId], references: [id], onDelete: Cascade)
  variantId     String
  variant       ProductVariant @relation(fields: [variantId], references: [id])

  @@map("consignment_items")
}

// ─────────────────────────────────────────────
// COMMISSIONS
// ─────────────────────────────────────────────

model CommissionRule {
  id    String         @id @default(uuid())
  type  CommissionType
  value Decimal        @db.Decimal(10, 2)

  userId    String
  user      User    @relation(fields: [userId], references: [id])
  productId String
  product   Product @relation(fields: [productId], references: [id])

  @@unique([userId, productId])
  @@map("commission_rules")
}

model SalesCommission {
  id     String                @id @default(uuid())
  amount Decimal               @db.Decimal(10, 2)
  status SalesCommissionStatus @default(PENDING)
  paidAt DateTime?

  orderId     String
  order       Order     @relation(fields: [orderId], references: [id])
  orderItemId String    @unique
  orderItem   OrderItem @relation(fields: [orderItemId], references: [id])
  salesRepId  String
  salesRep    User      @relation(fields: [salesRepId], references: [id])

  @@map("sales_commissions")
}

// ─────────────────────────────────────────────
// CONTENU
// ─────────────────────────────────────────────

model Article {
  id          String          @id @default(uuid())
  title       Json            // { "fr": "...", "en": "..." }
  slug        String          @unique
  content     Json            // { "fr": "...", "en": "..." }
  excerpt     Json?           // { "fr": "...", "en": "..." }
  coverImage  String?
  category    ArticleCategory
  isPublished Boolean         @default(false)
  publishedAt DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  authorId String
  author   User   @relation(fields: [authorId], references: [id])

  @@map("articles")
}

model SizeGuide {
  id      String @id @default(uuid())
  name    Json   // { "fr": "Guide des tailles Robes", "en": "Dresses Size Guide" }
  content Json   // { "fr": "...", "en": "..." }

  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])

  @@map("size_guides")
}

// ─────────────────────────────────────────────
// NEWSLETTER
// ─────────────────────────────────────────────

model NewsletterSubscriber {
  id             String    @id @default(uuid())
  email          String    @unique
  name           String?
  isActive       Boolean   @default(true)
  subscribedAt   DateTime  @default(now())
  unsubscribedAt DateTime?

  @@map("newsletter_subscribers")
}

// ─────────────────────────────────────────────
// FINANCE
// ─────────────────────────────────────────────

model Transaction {
  id          String              @id @default(uuid())
  type        TransactionType
  category    TransactionCategory
  amount      Decimal             @db.Decimal(10, 2)
  description String?
  receiptUrl  String?
  date        DateTime            @default(now())
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  createdById       String
  createdBy         User             @relation(fields: [createdById], references: [id])
  orderId           String?
  order             Order?           @relation(fields: [orderId], references: [id])
  purchaseOrderId   String?
  purchaseOrder     PurchaseOrder?   @relation(fields: [purchaseOrderId], references: [id])
  productionOrderId String?
  productionOrder   ProductionOrder? @relation(fields: [productionOrderId], references: [id])

  @@map("transactions")
}

// ─────────────────────────────────────────────
// SYSTÈME
// ─────────────────────────────────────────────

model Setting {
  id    String  @id @default(uuid())
  key   String  @unique
  value String
  label Json?   // { "fr": "...", "en": "..." }

  @@map("settings")
}

model Notification {
  id        String              @id @default(uuid())
  title     Json                // { "fr": "...", "en": "..." }
  message   Json                // { "fr": "...", "en": "..." }
  channel   NotificationChannel @default(IN_APP)
  isRead    Boolean             @default(false)
  readAt    DateTime?
  createdAt DateTime            @default(now())

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}

model AuditLog {
  id        String    @id @default(uuid())
  action    String
  entity    String
  entityId  String
  appSource AppSource
  metadata  Json?
  createdAt DateTime  @default(now())

  userId String
  user   User   @relation(fields: [userId], references: [id])

  @@index([entity, entityId])
  @@index([userId])
  @@index([createdAt])
  @@index([appSource])
  @@map("audit_logs")
}
```
