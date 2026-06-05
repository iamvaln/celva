import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PaymentAccount } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePaymentAccountDto } from './dto/create-payment-account.dto';
import type { UpdatePaymentAccountDto } from './dto/update-payment-account.dto';

/**
 * Treasury balance per account: derived purely from the Transaction ledger
 * (INCOME − EXPENSE) so the cash/OM/MoMo/bank balances reconcile against the
 * same source the finance dashboard reports on. Payment.paymentAccountId
 * records where an order's money landed, but the matching INCOME Transaction
 * is what moves the balance — counting both would double-count.
 */
export type PaymentAccountBalance = PaymentAccount & {
  income: string;
  expense: string;
  balance: string;
};

@Injectable()
export class PaymentAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  listAll(): Promise<PaymentAccount[]> {
    return this.prisma.paymentAccount.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string): Promise<PaymentAccount> {
    const account = await this.prisma.paymentAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('errors.not_found');
    return account;
  }

  create(dto: CreatePaymentAccountDto): Promise<PaymentAccount> {
    return this.prisma.paymentAccount.create({
      data: {
        name: dto.name,
        type: dto.type,
        identifier: dto.identifier ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePaymentAccountDto): Promise<PaymentAccount> {
    await this.assertExists(id);
    const data: Prisma.PaymentAccountUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.identifier !== undefined) data.identifier = dto.identifier;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.paymentAccount.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.assertExists(id);
    try {
      await this.prisma.paymentAccount.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        // Payments or transactions reference it (historic) — deactivate instead.
        throw new ConflictException('errors.payment_account_in_use');
      }
      throw err;
    }
  }

  /**
   * Live balance per account (Finance > Trésorerie). Returns every account,
   * including those with no movement yet (balance 0).
   */
  async balances(): Promise<PaymentAccountBalance[]> {
    const [accounts, grouped] = await Promise.all([
      this.prisma.paymentAccount.findMany({
        orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.transaction.groupBy({
        by: ['paymentAccountId', 'type'],
        where: { paymentAccountId: { not: null } },
        _sum: { amount: true },
      }),
    ]);

    return accounts.map((account) => {
      const income =
        grouped.find((g) => g.paymentAccountId === account.id && g.type === 'INCOME')?._sum
          .amount ?? new Prisma.Decimal(0);
      const expense =
        grouped.find((g) => g.paymentAccountId === account.id && g.type === 'EXPENSE')?._sum
          .amount ?? new Prisma.Decimal(0);
      return {
        ...account,
        income: income.toFixed(2),
        expense: expense.toFixed(2),
        balance: income.minus(expense).toFixed(2),
      };
    });
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.paymentAccount.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('errors.not_found');
  }
}
