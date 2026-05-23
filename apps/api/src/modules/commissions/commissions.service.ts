import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SalesCommissionStatus,
  type CommissionType,
  type SalesCommission,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ListCommissionsQuery } from './dto/list-commissions.query';

const INCLUDE = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
    },
  },
  orderItem: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      variant: {
        select: {
          sku: true,
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      },
    },
  },
  salesRep: { select: { id: true, name: true, email: true } },
} as const;

/**
 * Spec §15. Each OrderItem on an order WITH a salesRepId earns a
 * SalesCommission row when the order reaches CONFIRMED. Lookup order:
 *   1. CommissionRule per (salesRepId, productId) — bespoke override
 *   2. Product.defaultCommission(Type|Value) — fallback
 *
 * Cancellation deletes the rows per spec §7.5.
 */
@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Read ────────────────────────────────────────────────────────────

  async list(query: ListCommissionsQuery): Promise<{
    data: SalesCommission[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.SalesCommissionWhereInput = {
      ...(query.status ? { status: query.status as SalesCommissionStatus } : {}),
      ...(query.salesRepId ? { salesRepId: query.salesRepId } : {}),
      ...(query.from || query.to
        ? {
            order: {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lt: new Date(query.to) } : {}),
              },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { order: { orderNumber: { contains: query.search, mode: 'insensitive' } } },
              { salesRep: { email: { contains: query.search, mode: 'insensitive' } } },
              { salesRep: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDir ?? 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesCommission.findMany({
        where,
        include: INCLUDE,
        // SalesCommission has no createdAt; sort proxies through order.createdAt.
        orderBy:
          sortBy === 'createdAt'
            ? [{ order: { createdAt: sortDir } }, { id: 'asc' }]
            : [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.salesCommission.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findById(id: string) {
    const c = await this.prisma.salesCommission.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!c) throw new NotFoundException('errors.not_found');
    return c;
  }

  // ── Lifecycle hooks called from OrdersService / PaymentsService ────

  /**
   * Generates SalesCommission rows for every OrderItem on the order
   * IF the order has a salesRepId. No-op otherwise (storefront orders).
   * Idempotent — skips items that already have a commission row
   * (SalesCommission.orderItemId is unique).
   */
  async generateForOrder(
    orderId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: { include: { product: true } },
          },
        },
      },
    });
    if (!order || !order.salesRepId) return 0;

    // Filter out items already covered.
    const existing = await client.salesCommission.findMany({
      where: { orderId },
      select: { orderItemId: true },
    });
    const covered = new Set(existing.map((e) => e.orderItemId));
    const todo = order.items.filter((it) => !covered.has(it.id));
    if (todo.length === 0) return 0;

    // Per-product rule lookup in one query.
    const productIds = todo.map((it) => it.variant.productId);
    const rules = await client.commissionRule.findMany({
      where: { userId: order.salesRepId, productId: { in: productIds } },
    });
    const rulesByProduct = new Map(rules.map((r) => [r.productId, r]));

    let count = 0;
    for (const item of todo) {
      const rule = rulesByProduct.get(item.variant.productId);
      const cType: CommissionType = rule
        ? rule.type
        : item.variant.product.defaultCommissionType;
      const cValue: Prisma.Decimal = rule
        ? rule.value
        : item.variant.product.defaultCommissionValue;
      if (cValue.equals(0)) continue; // No commission configured

      // PERCENTAGE: lineTotal × value/100. FIXED: value × quantity.
      const lineTotal = item.unitPrice.mul(item.quantity);
      const amount =
        cType === 'PERCENTAGE'
          ? lineTotal.mul(cValue).div(100)
          : cValue.mul(item.quantity);

      await client.salesCommission.create({
        data: {
          orderId: order.id,
          orderItemId: item.id,
          salesRepId: order.salesRepId,
          amount: amount,
          status: SalesCommissionStatus.PENDING,
        },
      });
      count += 1;
    }

    if (count > 0) {
      this.logger.log(
        `Generated ${count} commission(s) for order ${order.orderNumber} (salesRep=${order.salesRepId})`,
      );
    }
    return count;
  }

  /**
   * Spec §7.5: order cancelled → commissions deleted. Idempotent.
   */
  async removeForOrder(
    orderId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    // Refuse to delete already-PAID commissions — they'd leave a
    // Transaction with no matching row. Surface a 400 to the caller
    // (which is OrdersService.cancel today) so the admin sees the
    // problem instead of a silent inconsistency.
    const paid = await client.salesCommission.count({
      where: { orderId, status: SalesCommissionStatus.PAID },
    });
    if (paid > 0) {
      throw new BadRequestException('errors.commission_already_paid');
    }
    const { count } = await client.salesCommission.deleteMany({ where: { orderId } });
    if (count > 0) {
      this.logger.log(`Removed ${count} commission(s) for cancelled order ${orderId}`);
    }
    return count;
  }

  // ── Pay-out ─────────────────────────────────────────────────────────

  /**
   * Marks PENDING commissions PAID + records one COMMISSION EXPENSE
   * Transaction per sales rep covered by the batch. All-or-nothing in
   * a single Prisma transaction so a partial failure doesn't leave
   * half-paid rows.
   */
  async markPaid(
    ids: string[],
    actorUserId: string,
  ): Promise<{
    paid: number;
    totalAmount: string;
    transactionIds: string[];
  }> {
    if (ids.length === 0) throw new BadRequestException('errors.validation_failed');

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.salesCommission.findMany({
        where: { id: { in: ids } },
        include: {
          salesRep: { select: { id: true, name: true, email: true } },
          order: { select: { orderNumber: true } },
        },
      });
      if (rows.length !== ids.length) {
        throw new NotFoundException('errors.not_found');
      }
      const notPending = rows.filter((r) => r.status !== SalesCommissionStatus.PENDING);
      if (notPending.length > 0) {
        throw new BadRequestException('errors.commission_already_paid');
      }

      const now = new Date();
      await tx.salesCommission.updateMany({
        where: { id: { in: ids } },
        data: { status: SalesCommissionStatus.PAID, paidAt: now },
      });

      // Group by sales rep so each pay-out gets its own Transaction
      // row — accountants prefer one line per beneficiary.
      const byRep = new Map<
        string,
        { rep: { name: string; email: string }; total: Prisma.Decimal; orderNumbers: string[] }
      >();
      for (const row of rows) {
        const existing = byRep.get(row.salesRepId);
        if (existing) {
          existing.total = existing.total.plus(row.amount);
          existing.orderNumbers.push(row.order.orderNumber);
        } else {
          byRep.set(row.salesRepId, {
            rep: { name: row.salesRep.name, email: row.salesRep.email },
            total: new Prisma.Decimal(row.amount),
            orderNumbers: [row.order.orderNumber],
          });
        }
      }

      const transactionIds: string[] = [];
      let grandTotal = new Prisma.Decimal(0);
      for (const [, group] of byRep) {
        const created = await tx.transaction.create({
          data: {
            type: 'EXPENSE',
            category: 'COMMISSION',
            amount: group.total,
            description: `Commission payée — ${group.rep.name} (${group.rep.email}) · ${group.orderNumbers.length} commande(s): ${group.orderNumbers.join(', ')}`,
            date: now,
            createdById: actorUserId,
          },
        });
        transactionIds.push(created.id);
        grandTotal = grandTotal.plus(group.total);
      }

      this.logger.log(
        `Marked ${rows.length} commission(s) PAID — total ${grandTotal.toFixed(2)} XAF across ${byRep.size} rep(s)`,
      );

      return {
        paid: rows.length,
        totalAmount: grandTotal.toFixed(2),
        transactionIds,
      };
    });
  }

  // ── Dashboard summary ───────────────────────────────────────────────

  /**
   * Per-sales-rep totals (owed = PENDING sum, paid = PAID sum).
   * Optional date window scopes via the order.createdAt.
   */
  async summaryBySalesRep(query: { from?: string; to?: string }): Promise<
    Array<{
      salesRep: { id: string; name: string; email: string };
      pendingAmount: string;
      paidAmount: string;
      pendingCount: number;
      paidCount: number;
    }>
  > {
    const orderWhere = query.from || query.to
      ? {
          order: {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lt: new Date(query.to) } : {}),
            },
          },
        }
      : {};
    const grouped = await this.prisma.salesCommission.groupBy({
      by: ['salesRepId', 'status'],
      where: orderWhere,
      _sum: { amount: true },
      _count: { _all: true },
    });
    const repIds = [...new Set(grouped.map((g) => g.salesRepId))];
    const reps = await this.prisma.user.findMany({
      where: { id: { in: repIds } },
      select: { id: true, name: true, email: true },
    });
    const repsById = new Map(reps.map((r) => [r.id, r]));

    const summary = new Map<
      string,
      { salesRep: { id: string; name: string; email: string }; pendingAmount: Prisma.Decimal; paidAmount: Prisma.Decimal; pendingCount: number; paidCount: number }
    >();
    for (const g of grouped) {
      const rep = repsById.get(g.salesRepId);
      if (!rep) continue;
      const cur = summary.get(g.salesRepId) ?? {
        salesRep: rep,
        pendingAmount: new Prisma.Decimal(0),
        paidAmount: new Prisma.Decimal(0),
        pendingCount: 0,
        paidCount: 0,
      };
      if (g.status === 'PENDING') {
        cur.pendingAmount = cur.pendingAmount.plus(g._sum.amount ?? 0);
        cur.pendingCount += g._count._all;
      } else {
        cur.paidAmount = cur.paidAmount.plus(g._sum.amount ?? 0);
        cur.paidCount += g._count._all;
      }
      summary.set(g.salesRepId, cur);
    }

    return [...summary.values()]
      .map((s) => ({
        salesRep: s.salesRep,
        pendingAmount: s.pendingAmount.toFixed(2),
        paidAmount: s.paidAmount.toFixed(2),
        pendingCount: s.pendingCount,
        paidCount: s.paidCount,
      }))
      .sort((a, b) => Number(b.pendingAmount) - Number(a.pendingAmount));
  }
}
