import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { STOCK_MOVEMENT_TYPE } from '@celva/shared';
import { StockMovementsService } from './stock-movements.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StockMovementsService — sign consistency (no DB)', () => {
  let service: StockMovementsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        StockMovementsService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(StockMovementsService);
  });

  it('rejects quantity = 0', async () => {
    await expect(
      service.apply({
        variantId: 'v1',
        quantity: 0,
        type: STOCK_MOVEMENT_TYPE.SALE_OUT,
        userId: 'u1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it.each([
    STOCK_MOVEMENT_TYPE.PRODUCTION_IN,
    STOCK_MOVEMENT_TYPE.PURCHASE_IN,
    STOCK_MOVEMENT_TYPE.CONSIGNMENT_RETURN,
    STOCK_MOVEMENT_TYPE.CANCELLATION_RETURN,
  ])('rejects negative quantity for %s (must be IN)', async (type) => {
    await expect(
      service.apply({ variantId: 'v1', quantity: -1, type, userId: 'u1' }),
    ).rejects.toThrow(/positive quantity/);
  });

  it.each([STOCK_MOVEMENT_TYPE.SALE_OUT, STOCK_MOVEMENT_TYPE.CONSIGNMENT_OUT])(
    'rejects positive quantity for %s (must be OUT)',
    async (type) => {
      await expect(
        service.apply({ variantId: 'v1', quantity: 1, type, userId: 'u1' }),
      ).rejects.toThrow(/negative quantity/);
    },
  );

  it('requires a reason for MANUAL_ADJUSTMENT', async () => {
    await expect(
      service.apply({
        variantId: 'v1',
        quantity: 5,
        type: STOCK_MOVEMENT_TYPE.MANUAL_ADJUSTMENT,
        userId: 'u1',
      }),
    ).rejects.toThrow(/requires a reason/);
  });
});
