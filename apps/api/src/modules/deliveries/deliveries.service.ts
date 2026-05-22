import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Delivery } from '@prisma/client';
import {
  DELIVERY_STATUS,
  ORDER_STATUS,
  type DeliveryMode,
  type DeliveryStatus,
} from '@celva/shared';
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
    dto: { actualCost?: number; trackingNote?: string },
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

    if (Object.keys(data).length === 0) return delivery;
    return this.prisma.delivery.update({ where: { id }, data });
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
    // Strip admin-internal fields (actualCost) before returning to the customer.
    const { actualCost: _drop, ...safe } = delivery;
    void _drop;
    return safe;
  }
}
