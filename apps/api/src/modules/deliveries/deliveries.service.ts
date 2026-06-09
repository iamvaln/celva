import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Delivery } from '@prisma/client';
import {
  DELIVERY_MODE,
  DELIVERY_STATUS,
  ORDER_STATUS,
  TRANSACTION_CATEGORY,
  TRANSACTION_TYPE,
  type DeliveryMode,
  type DeliveryStatus,
} from '@celva/shared';
import type { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { PrismaService } from '../prisma/prisma.service';
import type { ListDeliveriesQuery } from './dto/list-deliveries.query';

/**
 * Allowed forward transitions per spec §12.4. PENDING is the seed;
 * DELIVERED + FAILED are terminal (DELIVERED is happy, FAILED needs an
 * admin to either cancel the order or re-create a delivery flow). We
 * also allow late-binding ASSIGNED if the admin missed the explicit
 * action and went straight to PICKED_UP.
 */
const ALLOWED_TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  [DELIVERY_STATUS.PENDING]: [DELIVERY_STATUS.ASSIGNED, DELIVERY_STATUS.PICKED_UP, DELIVERY_STATUS.FAILED],
  [DELIVERY_STATUS.ASSIGNED]: [DELIVERY_STATUS.PICKED_UP, DELIVERY_STATUS.FAILED],
  [DELIVERY_STATUS.PICKED_UP]: [DELIVERY_STATUS.IN_TRANSIT, DELIVERY_STATUS.DELIVERED, DELIVERY_STATUS.FAILED],
  [DELIVERY_STATUS.IN_TRANSIT]: [DELIVERY_STATUS.DELIVERED, DELIVERY_STATUS.FAILED],
  [DELIVERY_STATUS.DELIVERED]: [],
  [DELIVERY_STATUS.FAILED]: [],
};

/**
 * When delivery flips to PICKED_UP / DELIVERED, mirror the customer-
 * visible order status forward so both surfaces stay in sync without
 * the admin clicking two transitions. Backward sync stays manual.
 */
const ORDER_SYNC: Partial<Record<DeliveryStatus, (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]>> = {
  [DELIVERY_STATUS.PICKED_UP]: ORDER_STATUS.SHIPPED,
  [DELIVERY_STATUS.DELIVERED]: ORDER_STATUS.DELIVERED,
};

const FULL_INCLUDE = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      shippingAddress: true,
      shippingCity: true,
      shippingPhone: true,
      notes: true,
      user: { select: { id: true, email: true, name: true, phone: true } },
    },
  },
  pickupPoint: { select: { id: true, name: true, address: true, city: true } },
} as const;

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Admin ───────────────────────────────────────────────────────────

  async listForAdmin(query: ListDeliveriesQuery): Promise<{
    data: Delivery[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where: Prisma.DeliveryWhereInput = {
      ...(query.status ? { status: query.status as DeliveryStatus } : {}),
      ...(query.mode ? { mode: query.mode as DeliveryMode } : {}),
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
            order: {
              OR: [
                {
                  orderNumber: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  user: {
                    email: { contains: query.search, mode: 'insensitive' },
                  },
                },
                {
                  user: {
                    name: { contains: query.search, mode: 'insensitive' },
                  },
                },
              ],
            },
          }
        : {}),
    };

    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDir ?? 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.delivery.findMany({
        where,
        include: FULL_INCLUDE,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findByIdForAdmin(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: FULL_INCLUDE,
    });
    if (!delivery) throw new NotFoundException('errors.not_found');
    return delivery;
  }

  async transitionStatus(
    id: string,
    nextStatus: DeliveryStatus,
    trackingNote?: string,
  ): Promise<Delivery> {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    if (!delivery) throw new NotFoundException('errors.not_found');

    const allowed = ALLOWED_TRANSITIONS[delivery.status as DeliveryStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException('errors.invalid_delivery_transition');
    }

    const now = new Date();
    const data: Prisma.DeliveryUpdateInput = { status: nextStatus };
    if (nextStatus === DELIVERY_STATUS.ASSIGNED && !delivery.assignedAt) {
      data.assignedAt = now;
    }
    if (nextStatus === DELIVERY_STATUS.PICKED_UP && !delivery.pickedUpAt) {
      data.pickedUpAt = now;
      // Auto-fill assignedAt if the admin skipped the explicit ASSIGNED hop.
      if (!delivery.assignedAt) data.assignedAt = now;
    }
    if (nextStatus === DELIVERY_STATUS.DELIVERED && !delivery.deliveredAt) {
      data.deliveredAt = now;
    }
    if (trackingNote !== undefined) {
      data.trackingNote = trackingNote.trim().length === 0 ? null : trackingNote;
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data,
    });

    // Mirror onto Order.status for the customer-visible state. Skip if
    // the order is in a terminal state we shouldn't disturb (CANCELLED /
    // COMPLETED). updateMany returns count=0 in that case — no throw.
    const orderTarget = ORDER_SYNC[nextStatus];
    if (orderTarget) {
      await this.prisma.order.updateMany({
        where: {
          id: delivery.orderId,
          status: {
            notIn: [ORDER_STATUS.CANCELLED, ORDER_STATUS.COMPLETED, orderTarget],
          },
        },
        data: { status: orderTarget },
      });
    }

    this.logger.log(
      `Delivery ${delivery.id} ${delivery.status} → ${nextStatus}` +
        (trackingNote ? ` · "${trackingNote.slice(0, 60)}"` : ''),
    );
    return updated;
  }

  async updateMetadata(
    id: string,
    dto: { actualCost?: number; trackingNote?: string; receiptUrl?: string },
  ): Promise<Delivery> {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    if (!delivery) throw new NotFoundException('errors.not_found');

    const data: Prisma.DeliveryUpdateInput = {};
    if (dto.actualCost !== undefined) {
      data.actualCost = new Prisma.Decimal(dto.actualCost);
    }
    if (dto.trackingNote !== undefined) {
      data.trackingNote = dto.trackingNote.trim().length === 0 ? null : dto.trackingNote;
    }
    if (dto.receiptUrl !== undefined) {
      data.receiptUrl = dto.receiptUrl.trim().length === 0 ? null : dto.receiptUrl;
    }

    if (Object.keys(data).length === 0) return delivery;
    return this.prisma.delivery.update({ where: { id }, data });
  }

  /**
   * Acheminement (spec §5.4): set the delivery mode + courier + real cost +
   * course receipt, advance the workflow, and — for the two delivery modes —
   * book a Transaction EXPENSE/DELIVERY for the course/courier cost on the
   * chosen payment account. Allowed only from a READY order.
   *
   *   STAFF_DELIVERY / HOME_DELIVERY → delivery IN_TRANSIT, order SHIPPED,
   *     expense booked when actualCost > 0.
   *   STORE_PICKUP / RELAY_PICKUP    → delivery ASSIGNED, order stays READY
   *     (client notified it's ready to collect), no expense.
   */
  async assign(deliveryId: string, dto: AssignDeliveryDto, actorUserId: string): Promise<Delivery> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: { select: { id: true, status: true, orderNumber: true } } },
    });
    if (!delivery) throw new NotFoundException('errors.not_found');
    if (delivery.order.status !== ORDER_STATUS.READY) {
      throw new BadRequestException('errors.delivery_not_routable');
    }
    if (dto.delivererId) {
      const exists = await this.prisma.user.findUnique({
        where: { id: dto.delivererId },
        select: { id: true },
      });
      if (!exists) throw new BadRequestException('errors.deliverer_not_found');
    }
    if (dto.paymentAccountId) {
      const exists = await this.prisma.paymentAccount.findUnique({
        where: { id: dto.paymentAccountId },
        select: { id: true },
      });
      if (!exists) throw new BadRequestException('errors.payment_account_not_found');
    }

    const isDelivery =
      dto.mode === DELIVERY_MODE.STAFF_DELIVERY || dto.mode === DELIVERY_MODE.HOME_DELIVERY;
    const cost = dto.actualCost != null ? new Prisma.Decimal(dto.actualCost) : new Prisma.Decimal(0);
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const d = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          mode: dto.mode,
          delivererId: dto.delivererId ?? undefined,
          actualCost: cost,
          receiptUrl:
            dto.receiptUrl !== undefined ? dto.receiptUrl.trim() || null : undefined,
          trackingNote:
            dto.trackingNote !== undefined ? dto.trackingNote.trim() || null : undefined,
          status: isDelivery ? DELIVERY_STATUS.IN_TRANSIT : DELIVERY_STATUS.ASSIGNED,
          assignedAt: delivery.assignedAt ?? now,
          pickedUpAt: isDelivery ? (delivery.pickedUpAt ?? now) : delivery.pickedUpAt,
        },
      });

      if (isDelivery) {
        await tx.order.update({
          where: { id: delivery.order.id },
          data: { status: ORDER_STATUS.SHIPPED },
        });
      }

      if (isDelivery && cost.greaterThan(0)) {
        await tx.transaction.create({
          data: {
            type: TRANSACTION_TYPE.EXPENSE,
            category: TRANSACTION_CATEGORY.DELIVERY,
            amount: cost,
            description: `Acheminement ${dto.mode} · commande ${delivery.order.orderNumber}`,
            orderId: delivery.order.id,
            createdById: actorUserId,
            paymentAccountId: dto.paymentAccountId ?? undefined,
          },
        });
      }

      return d;
    });

    this.logger.log(
      `Delivery ${deliveryId} assigned (${dto.mode}); order ${delivery.order.orderNumber} ${isDelivery ? '→ SHIPPED' : 'stays READY'}`,
    );
    return updated;
  }

  // ── Customer (own only) ─────────────────────────────────────────────

  async findForUserByOrderNumber(orderNumber: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, userId: true },
    });
    if (!order) throw new NotFoundException('errors.not_found');
    if (order.userId !== userId) throw new ForbiddenException('errors.forbidden');
    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId: order.id },
      include: { pickupPoint: { select: { id: true, name: true, address: true, city: true } } },
    });
    if (!delivery) throw new NotFoundException('errors.not_found');
    // Strip admin-internal fields (actualCost, course receipt) before
    // returning to the customer.
    const { actualCost: _drop, receiptUrl: _drop2, ...safe } = delivery;
    void _drop;
    void _drop2;
    return safe;
  }
}
