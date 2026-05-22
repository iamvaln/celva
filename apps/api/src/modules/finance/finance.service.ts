import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  type OrderChannel,
  type TransactionCategory,
  type TransactionType,
} from '@prisma/client';
import { ORDER_STATUS } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';

export type DashboardWindow = { from?: string; to?: string };

export type FinanceDashboard = {
  window: { from: string; to: string };
  kpis: {
    revenue: string;
    expenses: string;
    net: string;
    orderCount: number;
    deliveredOrderCount: number;
    averageOrderValue: string;
  };
  /** Last 12 calendar months, oldest → newest. Independent of the window param. */
  timeseries: Array<{
    month: string; // YYYY-MM
    revenue: string;
    expenses: string;
  }>;
  revenueByChannel: Array<{ channel: OrderChannel; total: string; orderCount: number }>;
  expensesByCategory: Array<{ category: TransactionCategory; total: string }>;
};

/**
 * Composite read-only dashboard endpoint that rolls up Order + Transaction
 * data. Designed to be hit once per page load by the admin; each section
 * is computed in parallel inside the service.
 */
@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(query: DashboardWindow): Promise<FinanceDashboard> {
    const { from, to } = this.resolveWindow(query);

    const [kpis, timeseries, revenueByChannel, expensesByCategory] = await Promise.all([
      this.computeKpis(from, to),
      this.computeTimeseries(),
      this.computeRevenueByChannel(from, to),
      this.computeExpensesByCategory(from, to),
    ]);

    return {
      window: { from: from.toISOString(), to: to.toISOString() },
      kpis,
      timeseries,
      revenueByChannel,
      expensesByCategory,
    };
  }

  // ── KPIs ────────────────────────────────────────────────────────────

  private async computeKpis(
    from: Date,
    to: Date,
  ): Promise<FinanceDashboard['kpis']> {
    // Revenue = sum of INCOME transactions in window.
    // Expenses = sum of EXPENSE transactions in window.
    // Order counts come from Order, not Transaction — count BY date of
    // order creation regardless of payment status (gives a "demand"
    // signal, not just cleared revenue).
    const [txAgg, orderCount, deliveredCount, orderTotalAgg] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: { date: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: from, lt: to },
          status: { notIn: [ORDER_STATUS.CANCELLED] },
        },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: from, lt: to },
          status: { in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED] },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: from, lt: to },
          status: { notIn: [ORDER_STATUS.CANCELLED] },
        },
        _sum: { total: true },
      }),
    ]);

    const revenue =
      txAgg.find((r) => r.type === 'INCOME')?._sum.amount ?? new Prisma.Decimal(0);
    const expenses =
      txAgg.find((r) => r.type === 'EXPENSE')?._sum.amount ?? new Prisma.Decimal(0);
    const net = revenue.minus(expenses);

    const orderTotal = orderTotalAgg._sum.total ?? new Prisma.Decimal(0);
    const aov =
      orderCount > 0
        ? orderTotal.dividedBy(orderCount)
        : new Prisma.Decimal(0);

    return {
      revenue: revenue.toFixed(2),
      expenses: expenses.toFixed(2),
      net: net.toFixed(2),
      orderCount,
      deliveredOrderCount: deliveredCount,
      averageOrderValue: aov.toFixed(2),
    };
  }

  // ── Timeseries ──────────────────────────────────────────────────────

  /**
   * Last 12 months. Groups happen at the application layer because
   * Prisma's groupBy can't bucket by calendar month without raw SQL,
   * and the volume here is small (≤ a few thousand rows / year).
   */
  private async computeTimeseries(): Promise<FinanceDashboard['timeseries']> {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
    );

    const txs = await this.prisma.transaction.findMany({
      where: { date: { gte: start } },
      select: { type: true, amount: true, date: true },
    });

    const buckets = new Map<string, { revenue: Prisma.Decimal; expenses: Prisma.Decimal }>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, {
        revenue: new Prisma.Decimal(0),
        expenses: new Prisma.Decimal(0),
      });
    }

    for (const tx of txs) {
      const key = `${tx.date.getUTCFullYear()}-${String(tx.date.getUTCMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (tx.type === 'INCOME') bucket.revenue = bucket.revenue.plus(tx.amount);
      else bucket.expenses = bucket.expenses.plus(tx.amount);
    }

    return [...buckets.entries()].map(([month, { revenue, expenses }]) => ({
      month,
      revenue: revenue.toFixed(2),
      expenses: expenses.toFixed(2),
    }));
  }

  // ── Revenue by channel ──────────────────────────────────────────────

  /**
   * Reads orders (not transactions) because channel lives on Order.
   * Sums Order.total — the customer-facing TTC amount, which matches
   * what a salesperson cares about when comparing channels.
   */
  private async computeRevenueByChannel(
    from: Date,
    to: Date,
  ): Promise<FinanceDashboard['revenueByChannel']> {
    const grouped = await this.prisma.order.groupBy({
      by: ['channel'],
      where: {
        createdAt: { gte: from, lt: to },
        status: { notIn: [ORDER_STATUS.CANCELLED] },
      },
      _sum: { total: true },
      _count: { _all: true },
    });
    return grouped
      .map((g) => ({
        channel: g.channel,
        total: (g._sum.total ?? new Prisma.Decimal(0)).toFixed(2),
        orderCount: g._count._all,
      }))
      .sort((a, b) => Number(b.total) - Number(a.total));
  }

  // ── Expenses by category ────────────────────────────────────────────

  private async computeExpensesByCategory(
    from: Date,
    to: Date,
  ): Promise<FinanceDashboard['expensesByCategory']> {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['category'],
      where: {
        type: 'EXPENSE' as TransactionType,
        date: { gte: from, lt: to },
      },
      _sum: { amount: true },
    });
    return grouped
      .map((g) => ({
        category: g.category,
        total: (g._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      }))
      .sort((a, b) => Number(b.total) - Number(a.total));
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  /**
   * Default window = current calendar month (UTC), [first-of-month, now).
   * If only `from` is given, `to` = now. If only `to` is given, `from`
   * = start of `to`'s month.
   */
  private resolveWindow(query: DashboardWindow): { from: Date; to: Date } {
    const now = new Date();
    let from: Date;
    let to: Date;
    if (query.from && query.to) {
      from = new Date(query.from);
      to = new Date(query.to);
    } else if (query.from) {
      from = new Date(query.from);
      to = now;
    } else if (query.to) {
      to = new Date(query.to);
      from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
    } else {
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      to = now;
    }
    return { from, to };
  }
}
