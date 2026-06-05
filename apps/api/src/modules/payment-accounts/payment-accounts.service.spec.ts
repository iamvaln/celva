import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PaymentAccountsService } from './payment-accounts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentAccountsService.balances (no DB)', () => {
  let service: PaymentAccountsService;
  const prisma = {
    paymentAccount: { findMany: jest.fn() },
    transaction: { groupBy: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [PaymentAccountsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(PaymentAccountsService);
  });

  it('computes balance = INCOME − EXPENSE per account, zero when no movement', async () => {
    prisma.paymentAccount.findMany.mockResolvedValue([
      { id: 'a', name: 'Caisse', type: 'CASH', identifier: null, isActive: true, createdAt: new Date() },
      { id: 'b', name: 'OM', type: 'ORANGE_MONEY', identifier: null, isActive: true, createdAt: new Date() },
    ]);
    prisma.transaction.groupBy.mockResolvedValue([
      { paymentAccountId: 'a', type: 'INCOME', _sum: { amount: new Prisma.Decimal(1000) } },
      { paymentAccountId: 'a', type: 'EXPENSE', _sum: { amount: new Prisma.Decimal(250) } },
    ]);

    const result = await service.balances();

    expect(result).toHaveLength(2);
    const a = result.find((r) => r.id === 'a')!;
    expect(a.income).toBe('1000.00');
    expect(a.expense).toBe('250.00');
    expect(a.balance).toBe('750.00');

    const b = result.find((r) => r.id === 'b')!;
    expect(b.balance).toBe('0.00');
  });
});
