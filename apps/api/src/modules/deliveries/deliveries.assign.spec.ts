import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { PrismaService } from '../prisma/prisma.service';

type Tx = {
  delivery: { update: jest.Mock };
  order: { update: jest.Mock };
  transaction: { create: jest.Mock };
};

describe('DeliveriesService.assign (no DB)', () => {
  let service: DeliveriesService;
  let tx: Tx;
  const prisma = {
    delivery: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    paymentAccount: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    tx = {
      delivery: { update: jest.fn().mockResolvedValue({ id: 'd1' }) },
      order: { update: jest.fn().mockResolvedValue({}) },
      transaction: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation((cb: (t: Tx) => unknown) => cb(tx));
    const moduleRef = await Test.createTestingModule({
      providers: [DeliveriesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(DeliveriesService);
  });

  const ready = (extra = {}) =>
    prisma.delivery.findUnique.mockResolvedValue({
      id: 'd1',
      assignedAt: null,
      pickedUpAt: null,
      order: { id: 'o1', status: 'READY', orderNumber: 'CMD-1' },
      ...extra,
    });

  it('rejects a non-READY order', async () => {
    prisma.delivery.findUnique.mockResolvedValue({
      id: 'd1',
      order: { id: 'o1', status: 'CONFIRMED', orderNumber: 'CMD-1' },
    });
    await expect(service.assign('d1', { mode: 'STAFF_DELIVERY' }, 'u1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('STAFF_DELIVERY with cost → IN_TRANSIT, order SHIPPED, books EXPENSE/DELIVERY', async () => {
    ready();
    await service.assign('d1', { mode: 'STAFF_DELIVERY', actualCost: 2500 }, 'u1');
    expect(tx.delivery.update.mock.calls[0][0].data.status).toBe('IN_TRANSIT');
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'SHIPPED' } }),
    );
    const t = tx.transaction.create.mock.calls[0][0].data;
    expect(t.type).toBe('EXPENSE');
    expect(t.category).toBe('DELIVERY');
    expect(t.amount.toString()).toBe('2500');
  });

  it('STORE_PICKUP → ASSIGNED, order untouched, no expense', async () => {
    ready();
    await service.assign('d1', { mode: 'STORE_PICKUP' }, 'u1');
    expect(tx.delivery.update.mock.calls[0][0].data.status).toBe('ASSIGNED');
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it('delivery mode with zero cost books no expense', async () => {
    ready();
    await service.assign('d1', { mode: 'HOME_DELIVERY' }, 'u1');
    expect(tx.order.update).toHaveBeenCalled();
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });
});
