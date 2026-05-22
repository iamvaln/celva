import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type Address,
  type DeliveryZone,
  type Order,
  type SavedPaymentMethod,
} from '@prisma/client';
import {
  DELIVERY_MODE,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  SETTING_KEYS,
  STOCK_MOVEMENT_TYPE,
  TAX_RATE_CAMEROON,
  type DeliveryMode,
  type OrderStatus,
  type PaymentMethod,
} from '@celva/shared';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { MailService } from '../mail/mail.service';
import type { Env } from '../../config/env';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { ListOrdersQuery } from './dto/list-orders.query';
import { CUSTOMER_VISIBLE_TRANSITIONS, fireOrderEmail } from './order-emails';

const TERMINAL_STATUSES: OrderStatus[] = [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED];

/**
 * Lifecycle per spec §7.5. PENDING is the seed state. Cancellation is a
 * separate flow (own endpoint) so the lifecycle here only covers forward
 * progress. SHIPPED can go either to DELIVERED (HOME courier) or skip
 * straight to DELIVERED from READY for pickups (spec §7.5
 * "READY → DELIVERED direct pour STORE_PICKUP/RELAY_PICKUP").
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.READY],
  [ORDER_STATUS.READY]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

const ORDER_NUMBER_PREFIX = 'CLV';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovements: StockMovementsService,
    private readonly deliveryZones: DeliveryZonesService,
    private readonly promoCodes: PromoCodesService,
    private readonly mail: MailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async listForUser(userId: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdForUser(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        payment: true,
        delivery: { include: { pickupPoint: true } },
        promoCode: true,
      },
    });
    if (!order) throw new NotFoundException('errors.not_found');
    if (order.userId !== userId) throw new ForbiddenException('errors.forbidden');
    return order;
  }

  async findByOrderNumberForUser(orderNumber: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        payment: true,
        delivery: { include: { pickupPoint: true } },
        promoCode: true,
      },
    });
    if (!order) throw new NotFoundException('errors.not_found');
    if (order.userId !== userId) throw new ForbiddenException('errors.forbidden');
    return order;
  }

  /**
   * The big one. Per spec §7.3:
   *  1. Load cart + revalidate every variant (active, stocked)
   *  2. Resolve delivery: zone+address for HOME, pickup point otherwise
   *  3. Resolve payment: saved method or new OM/MoMo phone; cash limited
   *     by MAX_CASH_ON_DELIVERY setting
   *  4. Compute totals: subtotal, discount (re-evaluate promo against
   *     subtotal), deliveryFee via DeliveryZonesService.computeFee (with
   *     FREE_DELIVERY_ENABLED setting), taxAmount (TAX_RATE setting),
   *     total
   *  5. Generate orderNumber CLV-YYYYMMDD-XXXX (atomic via tx + count)
   *  6. Single $transaction:
   *       - create Order + OrderItems (taxRate frozen per item)
   *       - StockMovement SALE_OUT for each item (decrements variant.stock)
   *       - create Delivery row (mode + pickup or actualCost from zone)
   *       - create Payment row (status PENDING; method-driven)
   *       - if promo: increment usedCount
   *       - clear the cart
   *       - if Cash on delivery → Order CONFIRMED (spec §10), else PENDING
   *  7. Return the fully-hydrated order.
   */
  async createFromCart(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: { include: { product: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('errors.cart_empty');
    }

    // 1) Revalidate variants
    for (const it of cart.items) {
      if (!it.variant.isActive || !it.variant.product.isActive) {
        throw new BadRequestException('errors.cart_variant_unavailable');
      }
      if (it.variant.stock < it.quantity) {
        throw new BadRequestException('errors.insufficient_stock');
      }
    }

    // 2) Resolve delivery
    const deliveryMode = dto.deliveryMode as DeliveryMode;
    let zone: DeliveryZone | null = null;
    let address: Address | null = null;
    let snapshot = {
      shippingAddress: null as string | null,
      shippingCity: null as string | null,
      shippingPhone: null as string | null,
    };

    if (deliveryMode === DELIVERY_MODE.HOME_DELIVERY) {
      if (!dto.deliveryZoneId) throw new BadRequestException('errors.delivery_zone_required');
      zone = await this.prisma.deliveryZone.findUnique({ where: { id: dto.deliveryZoneId } });
      if (!zone || !zone.isActive) {
        throw new BadRequestException('errors.delivery_zone_unavailable');
      }
      if (dto.shippingAddressId) {
        address = await this.prisma.address.findUnique({ where: { id: dto.shippingAddressId } });
        if (!address || address.userId !== userId) {
          throw new BadRequestException('errors.shipping_address_not_found');
        }
        snapshot = {
          shippingAddress: `${address.line1}${address.line2 ? `, ${address.line2}` : ''}`,
          shippingCity: address.city,
          shippingPhone: address.phone,
        };
      } else {
        snapshot = {
          shippingAddress: dto.shippingAddress ?? null,
          shippingCity: dto.shippingCity ?? null,
          shippingPhone: dto.shippingPhone ?? null,
        };
      }
    } else {
      // STORE_PICKUP or RELAY_PICKUP
      if (!dto.pickupPointId) throw new BadRequestException('errors.pickup_point_required');
      const point = await this.prisma.pickupPoint.findUnique({
        where: { id: dto.pickupPointId },
      });
      if (!point || !point.isActive) {
        throw new BadRequestException('errors.pickup_point_unavailable');
      }
    }

    // 3) Resolve payment
    const paymentMethod = dto.paymentMethod as PaymentMethod;
    let savedMethod: SavedPaymentMethod | null = null;
    let paymentPhone: string | null = null;
    if (
      paymentMethod === PAYMENT_METHOD.ORANGE_MONEY ||
      paymentMethod === PAYMENT_METHOD.MTN_MOMO
    ) {
      if (dto.savedPaymentMethodId) {
        savedMethod = await this.prisma.savedPaymentMethod.findUnique({
          where: { id: dto.savedPaymentMethodId },
        });
        if (!savedMethod || savedMethod.userId !== userId) {
          throw new BadRequestException('errors.saved_payment_method_not_found');
        }
        if (savedMethod.method !== paymentMethod) {
          throw new BadRequestException('errors.saved_payment_method_mismatch');
        }
        paymentPhone = savedMethod.phoneNumber;
      } else {
        if (!dto.paymentPhoneNumber) {
          throw new BadRequestException('errors.payment_phone_required');
        }
        paymentPhone = dto.paymentPhoneNumber;
      }
    }

    // 4) Compute totals
    const taxRate = await this.readSettingDecimal(SETTING_KEYS.TAX_RATE, TAX_RATE_CAMEROON);
    const freeDeliveryEnabled = await this.readSettingBoolean(
      SETTING_KEYS.FREE_DELIVERY_ENABLED,
      true,
    );

    const subtotal = cart.items.reduce(
      (sum, it) =>
        sum.add(
          (it.variant.priceOverride ?? it.variant.product.displayPrice).mul(it.quantity),
        ),
      new Prisma.Decimal(0),
    );

    let discount = new Prisma.Decimal(0);
    let appliedPromoId: string | null = null;
    if (dto.promoCode) {
      const evaluation = await this.promoCodes.evaluate(dto.promoCode, subtotal, userId);
      discount = new Prisma.Decimal(evaluation.discount);
      const promoRecord = await this.prisma.promoCode.findUnique({
        where: { code: evaluation.code },
      });
      if (promoRecord) appliedPromoId = promoRecord.id;
    }

    const deliveryFee =
      zone !== null
        ? this.deliveryZones.computeFee(zone, subtotal, freeDeliveryEnabled)
        : new Prisma.Decimal(0);

    // Tax is computed on the discounted subtotal (TTC pricing — spec §9
    // freezes the rate; the displayed TTC already embeds VAT, so this
    // value is the embedded VAT portion for accounting purposes).
    const taxableTtc = subtotal.minus(discount).plus(deliveryFee);
    const taxAmount = taxableTtc.minus(taxableTtc.div(new Prisma.Decimal(1).plus(taxRate)));

    const total = subtotal.minus(discount).plus(deliveryFee);

    if (paymentMethod === PAYMENT_METHOD.CASH_ON_DELIVERY) {
      const cap = await this.readSettingDecimal(SETTING_KEYS.MAX_CASH_ON_DELIVERY, 100_000);
      if (total.greaterThan(cap)) {
        throw new BadRequestException('errors.cash_on_delivery_over_cap');
      }
    }

    // 5) Order number — daily counter, retry on collision (rare).
    const orderNumber = await this.nextOrderNumber();

    // 6) The transaction
    const created = await this.prisma.$transaction(async (tx) => {
      const initialStatus: OrderStatus =
        paymentMethod === PAYMENT_METHOD.CASH_ON_DELIVERY
          ? ORDER_STATUS.CONFIRMED
          : ORDER_STATUS.PENDING;

      const order = await tx.order.create({
        data: {
          orderNumber,
          status: initialStatus,
          channel: 'WEBSITE',
          subtotal,
          deliveryFee,
          discount,
          total,
          taxAmount,
          shippingAddress: snapshot.shippingAddress,
          shippingCity: snapshot.shippingCity,
          shippingPhone: snapshot.shippingPhone,
          notes: dto.notes,
          userId,
          promoCodeId: appliedPromoId,
          items: {
            create: cart.items.map((it) => ({
              variantId: it.variantId,
              quantity: it.quantity,
              unitPrice: it.variant.priceOverride ?? it.variant.product.displayPrice,
              taxRate,
            })),
          },
        },
      });

      // Stock OUT — one StockMovement per line, signed negative
      for (const it of cart.items) {
        await this.stockMovements.apply({
          variantId: it.variantId,
          quantity: -it.quantity,
          type: STOCK_MOVEMENT_TYPE.SALE_OUT,
          userId,
          orderId: order.id,
          tx,
        });
      }

      // Delivery row
      await tx.delivery.create({
        data: {
          orderId: order.id,
          mode: deliveryMode,
          actualCost: zone ? zone.actualCost : new Prisma.Decimal(0),
          pickupPointId: dto.pickupPointId ?? null,
        },
      });

      // Payment row (PENDING — Batch S wires the OM/MoMo SDK call)
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: paymentMethod,
          status: PAYMENT_STATUS.PENDING,
          amount: total,
          phoneNumber: paymentPhone,
        },
      });

      // Promo usage tracking
      if (appliedPromoId) {
        await tx.promoCode.update({
          where: { id: appliedPromoId },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });

    this.logger.log(`Order ${orderNumber} created (status=${created.status}, total=${total.toFixed(2)})`);

    // Cash flow lands at CONFIRMED at checkout — send confirmation now. The
    // OM/MoMo path stays PENDING here; PaymentsService.markCompleted triggers
    // confirmation when the callback (or dev stub) promotes it to CONFIRMED.
    if (created.status === ORDER_STATUS.CONFIRMED) {
      this.dispatchOrderEmail(created.id, 'confirmation');
    }

    return this.findByIdForUser(created.id, userId);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Admin
  // ──────────────────────────────────────────────────────────────────────

  async listForAdmin(query: ListOrdersQuery): Promise<{
    data: Order[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status as OrderStatus } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lt: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search, mode: 'insensitive' } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
              { user: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDir ?? 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          items: { select: { id: true } },
          payment: { select: { method: true, status: true } },
        },
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findByIdForAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
        items: { include: { variant: { include: { product: true } } } },
        payment: true,
        delivery: { include: { pickupPoint: true } },
        promoCode: true,
      },
    });
    if (!order) throw new NotFoundException('errors.not_found');
    return order;
  }

  /**
   * Admin/manager forward-only lifecycle transition. Validates against
   * ALLOWED_TRANSITIONS and refuses to touch terminal orders. Cancellation
   * lives at cancel() — separate flow because it triggers stock + promo
   * side-effects.
   */
  async transitionStatus(
    orderId: string,
    nextStatus: OrderStatus,
    _actorUserId: string,
  ): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('errors.not_found');

    if (TERMINAL_STATUSES.includes(order.status as OrderStatus)) {
      throw new BadRequestException('errors.order_terminal');
    }
    const allowed = ALLOWED_TRANSITIONS[order.status as OrderStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException('errors.invalid_order_transition');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });
    this.logger.log(`Order ${order.orderNumber} ${order.status} → ${nextStatus}`);

    if (CUSTOMER_VISIBLE_TRANSITIONS.includes(nextStatus)) {
      this.dispatchOrderEmail(orderId, 'status');
    }
    return updated;
  }

  /**
   * Cancel an order per spec §7.5. Allowed only before SHIPPED. Atomic:
   *   - Order → CANCELLED
   *   - Stock restored via StockMovement CANCELLATION_RETURN for every item
   *     (signed positive — opposite of the SALE_OUT booked at checkout)
   *   - PromoCode.usedCount decremented if a code was applied
   *   - Payment stays as-is (refund flow is out of scope for this batch —
   *     a separate "refund" lifecycle would mark the Payment REFUNDED and
   *     book a Transaction EXPENSE; deferred to the finance batches).
   * Commissions are NOT cleared here yet (they don't exist until the
   * sales-commissions batch in Phase 6); when they do, this method should
   * delete them per spec §7.5.
   */
  async cancel(
    orderId: string,
    actorUserId: string,
    reason: string | undefined,
  ): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('errors.not_found');

    if (order.status === ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('errors.order_already_cancelled');
    }
    if (
      order.status === ORDER_STATUS.SHIPPED ||
      order.status === ORDER_STATUS.DELIVERED ||
      order.status === ORDER_STATUS.COMPLETED
    ) {
      throw new BadRequestException('errors.order_too_late_to_cancel');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: ORDER_STATUS.CANCELLED },
      });

      // Restore stock — every SALE_OUT movement booked at checkout has a
      // matching CANCELLATION_RETURN here.
      for (const it of order.items) {
        await this.stockMovements.apply({
          variantId: it.variantId,
          quantity: it.quantity, // positive
          type: STOCK_MOVEMENT_TYPE.CANCELLATION_RETURN,
          userId: actorUserId,
          orderId: order.id,
          reason: reason ?? undefined,
          tx,
        });
      }

      // Decrement promo usedCount if applicable.
      if (order.promoCodeId) {
        await tx.promoCode.update({
          where: { id: order.promoCodeId },
          data: { usedCount: { decrement: 1 } },
        });
      }

      this.logger.log(
        `Order ${order.orderNumber} CANCELLED${reason ? ` (${reason})` : ''} — stock restored on ${order.items.length} line(s)`,
      );
      return updated;
    }).then((result) => {
      this.dispatchOrderEmail(orderId, 'cancelled', reason);
      return result;
    });
  }

  /**
   * Customer-initiated cancellation. Stricter than admin's cancel — only
   * PENDING orders. Once an order is CONFIRMED the team is working on it;
   * the customer needs to call/WhatsApp instead.
   */
  async cancelMyOrder(
    orderId: string,
    userId: string,
    reason: string | undefined,
  ): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('errors.not_found');
    if (order.userId !== userId) throw new ForbiddenException('errors.forbidden');
    if (order.status !== ORDER_STATUS.PENDING) {
      throw new BadRequestException('errors.order_customer_cancel_too_late');
    }
    return this.cancel(orderId, userId, reason);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────

  private dispatchOrderEmail(
    orderId: string,
    kind: 'confirmation' | 'status' | 'cancelled',
    reason?: string,
  ): void {
    fireOrderEmail(
      {
        prisma: this.prisma,
        mail: this.mail,
        storefrontUrl: this.config.get('STOREFRONT_URL', { infer: true }),
        logger: this.logger,
      },
      orderId,
      kind,
      reason,
    );
  }

  private async readSettingDecimal(key: string, fallback: number): Promise<Prisma.Decimal> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) return new Prisma.Decimal(fallback);
    const n = Number(setting.value);
    return Number.isFinite(n) ? new Prisma.Decimal(setting.value) : new Prisma.Decimal(fallback);
  }

  private async readSettingBoolean(key: string, fallback: boolean): Promise<boolean> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) return fallback;
    const v = String(setting.value).toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes') return true;
    if (v === 'false' || v === '0' || v === 'no') return false;
    return fallback;
  }

  /**
   * CLV-YYYYMMDD-XXXX. Counter is "today's order count + 1" — racy under
   * heavy concurrent load but fine for our launch scale. Production-grade
   * sequence is a Phase 6 follow-up.
   */
  private async nextOrderNumber(): Promise<string> {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const prefix = `${ORDER_NUMBER_PREFIX}-${yyyy}${mm}${dd}-`;

    const start = new Date(Date.UTC(yyyy, now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(yyyy, now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    const sameDayCount = await this.prisma.order.count({
      where: { createdAt: { gte: start, lt: end } },
    });
    return `${prefix}${String(sameDayCount + 1).padStart(4, '0')}`;
  }
}
