import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ConsignmentStatus,
  Prisma,
  type Consignment,
} from '@prisma/client';
import { STOCK_MOVEMENT_TYPE } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { ReleaseConsignmentDto } from './dto/release-consignment.dto';
import { ReconcileConsignmentDto } from './dto/reconcile-consignment.dto';
import { ListConsignmentsQuery } from './dto/list-consignments.query';

const INCLUDE = {
  salesRep: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  items: {
    include: {
      variant: {
        select: {
          id: true,
          sku: true,
          priceOverride: true,
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              displayPrice: true,
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Spec §14. Off-site stock workflow used by sales reps for events,
 * pop-ups, partner boutiques. Lifecycle:
 *   ACTIVE     — stock decremented, consignedStock incremented
 *   RECONCILED — rep returned with results: per-item (sold + returned)
 *                = taken minus variance (loss / damage)
 *   CANCELLED  — full return; everything goes back to inventory
 *
 * Sales side: an INCOME / SALE Transaction is recorded at reconcile
 * time for the total off-site revenue. We don't create Order rows for
 * off-site sales — they bypass the storefront / online checkout and
 * tying them in would create artificial customers.
 */
@Injectable()
export class ConsignmentsService {
  private readonly logger = new Logger(ConsignmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovements: StockMovementsService,
  ) {}

  // ── Reads ───────────────────────────────────────────────────────────

  async list(query: ListConsignmentsQuery): Promise<{
    data: Consignment[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.ConsignmentWhereInput = {
      ...(query.status ? { status: query.status as ConsignmentStatus } : {}),
      ...(query.salesRepId ? { salesRepId: query.salesRepId } : {}),
      ...(query.from || query.to
        ? {
            releasedAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lt: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { notes: { contains: query.search, mode: 'insensitive' } },
              { salesRep: { name: { contains: query.search, mode: 'insensitive' } } },
              { salesRep: { email: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const sortBy = query.sortBy ?? 'releasedAt';
    const sortDir = query.sortDir ?? 'desc';
    const [data, total] = await this.prisma.$transaction([
      this.prisma.consignment.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.consignment.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async findById(id: string) {
    const consignment = await this.prisma.consignment.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!consignment) throw new NotFoundException('errors.not_found');
    return consignment;
  }

  // ── Release ─────────────────────────────────────────────────────────

  /**
   * Decrement variant.stock + increment variant.consignedStock for each
   * line via StockMovementsService apply(CONSIGNMENT_OUT). All-or-
   * nothing in a single Prisma transaction so an insufficient-stock
   * line rolls back the others.
   */
  async release(
    dto: ReleaseConsignmentDto,
    actorUserId: string,
  ): Promise<Consignment> {
    const rep = await this.prisma.user.findUnique({ where: { id: dto.salesRepId } });
    if (!rep) throw new BadRequestException('errors.user_not_found');

    const variantIds = dto.items.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
    });
    if (variants.length !== new Set(variantIds).size) {
      throw new BadRequestException('errors.variant_not_found');
    }
    for (const item of dto.items) {
      const v = variants.find((x) => x.id === item.variantId);
      if (!v || v.stock < item.quantity) {
        throw new BadRequestException('errors.insufficient_stock');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const consignment = await tx.consignment.create({
        data: {
          salesRepId: dto.salesRepId,
          createdById: actorUserId,
          notes: dto.notes ?? null,
          status: ConsignmentStatus.ACTIVE,
          items: {
            create: dto.items.map((it) => ({
              variantId: it.variantId,
              quantityTaken: it.quantity,
            })),
          },
        },
        include: INCLUDE,
      });

      // Stock OUT — one CONSIGNMENT_OUT per line. StockMovementsService
      // also handles the consignedStock counter via its branch on
      // CONSIGNMENT_OUT (stock decrement + consignedStock increment).
      for (const item of dto.items) {
        await this.stockMovements.apply({
          variantId: item.variantId,
          quantity: -item.quantity,
          type: STOCK_MOVEMENT_TYPE.CONSIGNMENT_OUT,
          userId: actorUserId,
          consignmentId: consignment.id,
          reason: dto.notes ?? `Consignment ${consignment.id}`,
          tx,
        });
      }

      this.logger.log(
        `Consignment ${consignment.id} released to ${rep.email} — ${dto.items.length} line(s)`,
      );
      return consignment;
    });
  }

  // ── Reconcile ───────────────────────────────────────────────────────

  /**
   * Per-item: (quantitySold + quantityReturned) must be ≤ quantityTaken.
   * The difference is variance (loss / damage). For each line:
   *   - returned > 0 → CONSIGNMENT_RETURN movement (stock += returned,
   *     consignedStock -= returned)
   *   - variance > 0 → MANUAL_ADJUSTMENT on consignedStock only (the
   *     stock was already lost on RELEASE; we just need to clear the
   *     consigned counter). We do this with a CONSIGNMENT_RETURN
   *     followed by a MANUAL_ADJUSTMENT that brings stock back down,
   *     keeping the audit trail intact.
   *
   * Sold units stay decremented from stock; they're realised revenue
   * recorded as one INCOME / SALE Transaction.
   */
  async reconcile(
    id: string,
    dto: ReconcileConsignmentDto,
    actorUserId: string,
  ): Promise<Consignment> {
    const consignment = await this.prisma.consignment.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!consignment) throw new NotFoundException('errors.not_found');
    if (consignment.status !== ConsignmentStatus.ACTIVE) {
      throw new BadRequestException('errors.consignment_not_active');
    }

    // Index incoming items by id; verify they all belong to this consignment.
    const itemMap = new Map(consignment.items.map((it) => [it.id, it]));
    for (const incoming of dto.items) {
      const item = itemMap.get(incoming.id);
      if (!item) {
        throw new BadRequestException('errors.consignment_item_not_found');
      }
      if (incoming.quantitySold + incoming.quantityReturned > item.quantityTaken) {
        throw new BadRequestException('errors.consignment_overflow');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let totalRevenue = new Prisma.Decimal(0);

      for (const incoming of dto.items) {
        const item = itemMap.get(incoming.id)!;
        const variance =
          item.quantityTaken - incoming.quantitySold - incoming.quantityReturned;

        // Returned items: restore both stock and consignedStock.
        if (incoming.quantityReturned > 0) {
          await this.stockMovements.apply({
            variantId: item.variantId,
            quantity: incoming.quantityReturned,
            type: STOCK_MOVEMENT_TYPE.CONSIGNMENT_RETURN,
            userId: actorUserId,
            consignmentId: consignment.id,
            tx,
          });
        }

        // Variance (lost / damaged): book a CONSIGNMENT_RETURN to clear
        // the consigned counter + a MANUAL_ADJUSTMENT to bring stock
        // back DOWN — net effect: consignedStock cleared, real stock
        // stays gone. Two movements so the audit log shows both legs.
        if (variance > 0) {
          await this.stockMovements.apply({
            variantId: item.variantId,
            quantity: variance,
            type: STOCK_MOVEMENT_TYPE.CONSIGNMENT_RETURN,
            userId: actorUserId,
            consignmentId: consignment.id,
            reason: `Variance (lost / damaged)`,
            tx,
          });
          await this.stockMovements.apply({
            variantId: item.variantId,
            quantity: -variance,
            type: STOCK_MOVEMENT_TYPE.MANUAL_ADJUSTMENT,
            userId: actorUserId,
            consignmentId: consignment.id,
            reason: `Consignment variance — ${variance} unit(s) lost/damaged`,
            tx,
          });
        }

        // Persist sold / returned counters.
        await tx.consignmentItem.update({
          where: { id: incoming.id },
          data: {
            quantitySold: incoming.quantitySold,
            quantityReturned: incoming.quantityReturned,
          },
        });

        // Revenue contribution: use override or product display price.
        const variant = consignment.items.find((i) => i.id === incoming.id)?.variant;
        const unitPrice =
          dto.unitPriceOverride !== undefined
            ? new Prisma.Decimal(dto.unitPriceOverride)
            : (variant?.priceOverride ?? variant?.product.displayPrice ?? new Prisma.Decimal(0));
        totalRevenue = totalRevenue.plus(
          new Prisma.Decimal(incoming.quantitySold).mul(unitPrice),
        );
      }

      const updated = await tx.consignment.update({
        where: { id },
        data: {
          status: ConsignmentStatus.RECONCILED,
          reconciledAt: new Date(),
          notes: dto.notes ?? consignment.notes,
        },
        include: INCLUDE,
      });

      // Single INCOME / SALE Transaction for the consigned revenue.
      // Granular per-item rows would explode the ledger.
      if (totalRevenue.greaterThan(0)) {
        await tx.transaction.create({
          data: {
            type: 'INCOME',
            category: 'SALE',
            amount: totalRevenue,
            description: `Consignment réconciliée — ${consignment.id} (${consignment.salesRep.email})`,
            date: new Date(),
            createdById: actorUserId,
          },
        });
      }

      this.logger.log(
        `Consignment ${id} RECONCILED — revenue ${totalRevenue.toFixed(2)} XAF`,
      );
      return updated;
    });
  }

  // ── Cancel ──────────────────────────────────────────────────────────

  /**
   * Restore everything as if it never went out. Only ACTIVE
   * consignments can be cancelled.
   */
  async cancel(id: string, actorUserId: string): Promise<Consignment> {
    const consignment = await this.prisma.consignment.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!consignment) throw new NotFoundException('errors.not_found');
    if (consignment.status !== ConsignmentStatus.ACTIVE) {
      throw new BadRequestException('errors.consignment_not_active');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of consignment.items) {
        await this.stockMovements.apply({
          variantId: item.variantId,
          quantity: item.quantityTaken,
          type: STOCK_MOVEMENT_TYPE.CONSIGNMENT_RETURN,
          userId: actorUserId,
          consignmentId: consignment.id,
          reason: 'Consignment cancelled',
          tx,
        });
        await tx.consignmentItem.update({
          where: { id: item.id },
          data: { quantityReturned: item.quantityTaken },
        });
      }
      const updated = await tx.consignment.update({
        where: { id },
        data: { status: ConsignmentStatus.CANCELLED, reconciledAt: new Date() },
        include: INCLUDE,
      });
      this.logger.log(`Consignment ${id} CANCELLED — full return`);
      return updated;
    });
  }
}

