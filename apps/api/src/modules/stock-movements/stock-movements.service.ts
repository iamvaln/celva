import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma, type ProductVariant, type StockMovement } from '@prisma/client';
import { STOCK_MOVEMENT_TYPE, type StockMovementType } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';

export type StockMovementRequest = {
  variantId: string;
  /** Signed delta: positive = stock IN, negative = stock OUT. */
  quantity: number;
  type: StockMovementType;
  userId: string;
  reason?: string;
  orderId?: string;
  orderItemId?: string;
  productionOrderId?: string;
  consignmentId?: string;
  /** Pass an existing transaction client to enroll this movement in it. */
  tx?: Prisma.TransactionClient;
};

const INCREMENT_TYPES = new Set<StockMovementType>([
  STOCK_MOVEMENT_TYPE.PRODUCTION_IN,
  STOCK_MOVEMENT_TYPE.PURCHASE_IN,
  STOCK_MOVEMENT_TYPE.CONSIGNMENT_RETURN,
  STOCK_MOVEMENT_TYPE.CANCELLATION_RETURN,
]);

const DECREMENT_TYPES = new Set<StockMovementType>([
  STOCK_MOVEMENT_TYPE.SALE_OUT,
  STOCK_MOVEMENT_TYPE.CONSIGNMENT_OUT,
]);

/**
 * Central, single-point service for ALL stock mutations on ProductVariant.
 * Direct writes to ProductVariant.stock anywhere else in the codebase are
 * a bug — every other module MUST go through this service.
 */
@Injectable()
export class StockMovementsService {
  private readonly logger = new Logger(StockMovementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async apply(req: StockMovementRequest): Promise<StockMovement> {
    this.assertSignConsistency(req);

    const execute = async (
      tx: Prisma.TransactionClient,
    ): Promise<{ movement: StockMovement; variant: ProductVariant }> => {
      let variant: ProductVariant;

      if (
        req.type === STOCK_MOVEMENT_TYPE.CONSIGNMENT_OUT ||
        req.type === STOCK_MOVEMENT_TYPE.CONSIGNMENT_RETURN
      ) {
        variant = await tx.productVariant.update({
          where: { id: req.variantId },
          data: {
            stock: { increment: req.quantity },
            consignedStock: { increment: -req.quantity },
          },
        });
      } else {
        variant = await tx.productVariant.update({
          where: { id: req.variantId },
          data: { stock: { increment: req.quantity } },
        });
      }

      if (variant.stock < 0) {
        throw new BadRequestException(`Insufficient stock for variant ${req.variantId}`);
      }

      const movement = await tx.stockMovement.create({
        data: {
          variantId: req.variantId,
          quantity: req.quantity,
          type: req.type,
          reason: req.reason,
          createdById: req.userId,
          orderId: req.orderId,
          orderItemId: req.orderItemId,
          productionOrderId: req.productionOrderId,
          consignmentId: req.consignmentId,
        },
      });

      return { movement, variant };
    };

    const result = req.tx
      ? await execute(req.tx)
      : await this.prisma.$transaction(execute);

    this.logger.debug(
      `StockMovement ${result.movement.type} variant=${req.variantId} qty=${req.quantity} → stock=${result.variant.stock}`,
    );

    return result.movement;
  }

  private assertSignConsistency(req: StockMovementRequest): void {
    if (req.quantity === 0) {
      throw new BadRequestException('StockMovement quantity must be non-zero');
    }
    if (INCREMENT_TYPES.has(req.type) && req.quantity < 0) {
      throw new BadRequestException(`Type ${req.type} requires a positive quantity`);
    }
    if (DECREMENT_TYPES.has(req.type) && req.quantity > 0) {
      throw new BadRequestException(`Type ${req.type} requires a negative quantity`);
    }
    if (req.type === STOCK_MOVEMENT_TYPE.MANUAL_ADJUSTMENT && !req.reason) {
      throw new BadRequestException('MANUAL_ADJUSTMENT requires a reason');
    }
  }
}
