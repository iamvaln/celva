import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type Transaction,
  type TransactionCategory,
  type TransactionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { ListTransactionsQuery } from './dto/list-transactions.query';

/**
 * Transactions are the canonical income / expense ledger. Two sources:
 *   1. Auto-generated: PaymentsService.markCompleted writes an INCOME
 *      / SALE row with a non-null orderId. These are immutable — editing
 *      or deleting them would diverge the ledger from the order history.
 *   2. Manual: ADMIN/MANAGER entries via this service (expenses,
 *      one-off incomes, refunds in the future). orderId optional.
 *
 * "manual" = no orderId. Service uses that to gate update/delete.
 */
@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  private readonly include = {
    order: { select: { id: true, orderNumber: true } },
    createdBy: { select: { id: true, name: true, email: true } },
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListTransactionsQuery): Promise<{
    data: Transaction[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where: Prisma.TransactionWhereInput = {
      ...(query.type ? { type: query.type as TransactionType } : {}),
      ...(query.category ? { category: query.category as TransactionCategory } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lt: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            description: { contains: query.search, mode: 'insensitive' },
          }
        : {}),
    };

    const sortBy = query.sortBy ?? 'date';
    const sortDir = query.sortDir ?? 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: this.include,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findById(id: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: this.include,
    });
    if (!tx) throw new NotFoundException('errors.not_found');
    return tx;
  }

  async create(dto: CreateTransactionDto, actorUserId: string): Promise<Transaction> {
    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        select: { id: true },
      });
      if (!order) throw new BadRequestException('errors.order_not_found');
    }
    return this.prisma.transaction.create({
      data: {
        type: dto.type as TransactionType,
        category: dto.category as TransactionCategory,
        amount: new Prisma.Decimal(dto.amount),
        description: dto.description ?? null,
        receiptUrl: dto.receiptUrl ?? null,
        date: dto.date ? new Date(dto.date) : new Date(),
        orderId: dto.orderId ?? null,
        createdById: actorUserId,
      },
      include: this.include,
    });
  }

  async update(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const existing = await this.prisma.transaction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    this.assertManual(existing);

    const data: Prisma.TransactionUpdateInput = {};
    if (dto.type !== undefined) data.type = dto.type as TransactionType;
    if (dto.category !== undefined)
      data.category = dto.category as TransactionCategory;
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.description !== undefined) {
      data.description =
        dto.description.trim().length === 0 ? null : dto.description;
    }
    if (dto.receiptUrl !== undefined) {
      data.receiptUrl =
        dto.receiptUrl.trim().length === 0 ? null : dto.receiptUrl;
    }
    if (dto.date !== undefined) data.date = new Date(dto.date);

    return this.prisma.transaction.update({
      where: { id },
      data,
      include: this.include,
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.transaction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    this.assertManual(existing);
    await this.prisma.transaction.delete({ where: { id } });
  }

  /**
   * Aggregate summary for a date window: totals by type and category.
   * Feeds the finance dashboard (coming in a follow-up batch). For now
   * it's reachable from the API for spot-checks.
   */
  async summary(query: { from?: string; to?: string }): Promise<{
    totalIncome: string;
    totalExpense: string;
    net: string;
    byCategory: Array<{
      category: TransactionCategory;
      type: TransactionType;
      total: string;
    }>;
  }> {
    const where: Prisma.TransactionWhereInput = {
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lt: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const grouped = await this.prisma.transaction.groupBy({
      by: ['type', 'category'],
      where,
      _sum: { amount: true },
    });

    let totalIncome = new Prisma.Decimal(0);
    let totalExpense = new Prisma.Decimal(0);
    const byCategory = grouped.map((g) => {
      const total = g._sum.amount ?? new Prisma.Decimal(0);
      if (g.type === 'INCOME') totalIncome = totalIncome.plus(total);
      else totalExpense = totalExpense.plus(total);
      return {
        category: g.category,
        type: g.type,
        total: total.toFixed(2),
      };
    });

    return {
      totalIncome: totalIncome.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      net: totalIncome.minus(totalExpense).toFixed(2),
      byCategory,
    };
  }

  /** Manual rows have orderId === null (paymentService writes order-linked rows). */
  private assertManual(tx: { orderId: string | null }): void {
    if (tx.orderId !== null) {
      throw new BadRequestException('errors.transaction_immutable');
    }
  }
}
