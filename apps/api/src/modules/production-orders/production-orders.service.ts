import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProductionOrderStatus,
  type ProductionOrder,
  type ProductionOrderType,
} from '@prisma/client';
import { STOCK_MOVEMENT_TYPE } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { ListProductionOrdersQuery } from './dto/list-production-orders.query';

const INCLUDE = {
  product: { select: { id: true, slug: true, name: true, costPrice: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  materialConsumptions: {
    include: {
      rawMaterial: { select: { id: true, name: true, unit: true, unitPrice: true } },
    },
  },
  stages: { orderBy: { sortOrder: 'asc' } },
} as const;

/**
 * Spec §6. Production runs that turn raw materials into finished goods.
 *   PLANNED → IN_PROGRESS → COMPLETED  (or → CANCELLED)
 *
 * - start (PLANNED → IN_PROGRESS): consumes raw materials
 *   (RawMaterial.stockQty -= quantityUsed). Validates sufficient stock.
 * - complete (IN_PROGRESS → COMPLETED): increments the finished-good
 *   variant stock (when the product has exactly one variant — multi-
 *   variant assignment is a follow-up), recomputes Product.costPrice
 *   from materials + labour + subcontract, and books the labour /
 *   subcontract EXPENSE(s). Material cost was already expensed at
 *   purchase, so it's not re-booked.
 * - cancel: PLANNED only (nothing consumed yet) OR IN_PROGRESS with a
 *   material restock.
 */
@Injectable()
export class ProductionOrdersService {
  private readonly logger = new Logger(ProductionOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovements: StockMovementsService,
  ) {}

  async list(query: ListProductionOrdersQuery): Promise<{
    data: ProductionOrder[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.ProductionOrderWhereInput = {
      ...(query.status ? { status: query.status as ProductionOrderStatus } : {}),
      ...(query.type ? { type: query.type as ProductionOrderType } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
    };
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDir ?? 'desc';
    const [data, total] = await this.prisma.$transaction([
      this.prisma.productionOrder.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.productionOrder.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async findById(id: string) {
    const po = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!po) throw new NotFoundException('errors.not_found');
    return po;
  }

  async create(
    dto: CreateProductionOrderDto,
    actorUserId: string,
  ): Promise<ProductionOrder> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });
    if (!product) throw new BadRequestException('errors.product_not_found');

    const materialIds = [...new Set(dto.consumptions.map((c) => c.rawMaterialId))];
    const found = await this.prisma.rawMaterial.count({
      where: { id: { in: materialIds } },
    });
    if (found !== materialIds.length) {
      throw new BadRequestException('errors.raw_material_not_found');
    }

    return this.prisma.productionOrder.create({
      data: {
        productId: dto.productId,
        type: dto.type as ProductionOrderType,
        quantity: dto.quantity,
        laborCost: new Prisma.Decimal(dto.laborCost ?? 0),
        subcontractCost: new Prisma.Decimal(dto.subcontractCost ?? 0),
        subcontractorName: dto.subcontractorName ?? null,
        notes: dto.notes ?? null,
        status: ProductionOrderStatus.PLANNED,
        createdById: actorUserId,
        materialConsumptions: {
          create: dto.consumptions.map((c) => ({
            rawMaterialId: c.rawMaterialId,
            quantityUsed: new Prisma.Decimal(c.quantityUsed),
          })),
        },
        stages: {
          create: (dto.stages ?? []).map((s, i) => ({
            name: s.name,
            sortOrder: s.sortOrder ?? i,
          })),
        },
      },
      include: INCLUDE,
    });
  }

  /**
   * PLANNED → IN_PROGRESS. Consumes raw materials. Validates stock for
   * every line up front so we don't partially consume.
   */
  async start(id: string): Promise<ProductionOrder> {
    const po = await this.findById(id);
    if (po.status !== ProductionOrderStatus.PLANNED) {
      throw new BadRequestException('errors.production_order_not_planned');
    }

    const materials = await this.prisma.rawMaterial.findMany({
      where: { id: { in: po.materialConsumptions.map((c) => c.rawMaterialId) } },
    });
    const byId = new Map(materials.map((m) => [m.id, m]));
    for (const c of po.materialConsumptions) {
      const m = byId.get(c.rawMaterialId);
      if (!m || m.stockQty.lessThan(c.quantityUsed)) {
        throw new BadRequestException('errors.insufficient_raw_material');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const c of po.materialConsumptions) {
        await tx.rawMaterial.update({
          where: { id: c.rawMaterialId },
          data: { stockQty: { decrement: c.quantityUsed } },
        });
      }
      const updated = await tx.productionOrder.update({
        where: { id },
        data: { status: ProductionOrderStatus.IN_PROGRESS, startDate: new Date() },
        include: INCLUDE,
      });
      this.logger.log(`ProductionOrder ${id} started — consumed ${po.materialConsumptions.length} material(s)`);
      return updated;
    });
  }

  /**
   * IN_PROGRESS → COMPLETED. Increments finished-good stock (single-
   * variant products), recomputes costPrice, books labour/subcontract
   * EXPENSE.
   */
  async complete(id: string, actorUserId: string): Promise<ProductionOrder> {
    const po = await this.findById(id);
    if (po.status !== ProductionOrderStatus.IN_PROGRESS) {
      throw new BadRequestException('errors.production_order_not_in_progress');
    }

    // Compute per-unit cost: materials (qtyUsed × unitPrice) + labour + subcontract.
    let materialTotal = new Prisma.Decimal(0);
    for (const c of po.materialConsumptions) {
      materialTotal = materialTotal.plus(
        c.quantityUsed.mul(c.rawMaterial.unitPrice),
      );
    }
    const runTotal = materialTotal.plus(po.laborCost).plus(po.subcontractCost);
    const perUnit = po.quantity > 0 ? runTotal.div(po.quantity) : new Prisma.Decimal(0);

    // Single-variant products get an automatic finished-good restock.
    const variants = await this.prisma.productVariant.findMany({
      where: { productId: po.productId },
      select: { id: true },
    });

    return this.prisma.$transaction(async (tx) => {
      if (variants.length === 1) {
        await this.stockMovements.apply({
          variantId: variants[0]!.id,
          quantity: po.quantity,
          type: STOCK_MOVEMENT_TYPE.PRODUCTION_IN,
          userId: actorUserId,
          productionOrderId: po.id,
          reason: `Production ${po.id}`,
          tx,
        });
      }

      // Recompute Product.costPrice (spec §6: auto-computed on completion).
      await tx.product.update({
        where: { id: po.productId },
        data: { costPrice: perUnit },
      });

      // Mark all stages completed.
      await tx.productionStage.updateMany({
        where: { productionOrderId: id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      // Book labour + subcontract EXPENSE (materials already expensed at PO).
      if (po.laborCost.greaterThan(0)) {
        await tx.transaction.create({
          data: {
            type: 'EXPENSE',
            category: 'SALARY',
            amount: po.laborCost,
            description: `Main d'œuvre — production ${po.id}`,
            date: new Date(),
            createdById: actorUserId,
            productionOrderId: id,
          },
        });
      }
      if (po.subcontractCost.greaterThan(0)) {
        await tx.transaction.create({
          data: {
            type: 'EXPENSE',
            category: 'SUBCONTRACTING',
            amount: po.subcontractCost,
            description: `Sous-traitance${po.subcontractorName ? ` (${po.subcontractorName})` : ''} — production ${po.id}`,
            date: new Date(),
            createdById: actorUserId,
            productionOrderId: id,
          },
        });
      }

      const updated = await tx.productionOrder.update({
        where: { id },
        data: { status: ProductionOrderStatus.COMPLETED, endDate: new Date() },
        include: INCLUDE,
      });
      this.logger.log(
        `ProductionOrder ${id} COMPLETED — costPrice ${perUnit.toFixed(2)}/unit` +
          (variants.length === 1 ? `, +${po.quantity} finished stock` : ' (multi-variant: no auto-restock)'),
      );
      return updated;
    });
  }

  /**
   * Cancel. PLANNED → nothing to undo. IN_PROGRESS → restock the
   * consumed materials. COMPLETED can't be cancelled.
   */
  async cancel(id: string, actorUserId: string): Promise<ProductionOrder> {
    const po = await this.findById(id);
    if (
      po.status === ProductionOrderStatus.COMPLETED ||
      po.status === ProductionOrderStatus.CANCELLED
    ) {
      throw new BadRequestException('errors.production_order_not_cancellable');
    }

    return this.prisma.$transaction(async (tx) => {
      if (po.status === ProductionOrderStatus.IN_PROGRESS) {
        // Restore consumed materials.
        for (const c of po.materialConsumptions) {
          await tx.rawMaterial.update({
            where: { id: c.rawMaterialId },
            data: { stockQty: { increment: c.quantityUsed } },
          });
        }
      }
      const updated = await tx.productionOrder.update({
        where: { id },
        data: { status: ProductionOrderStatus.CANCELLED, endDate: new Date() },
        include: INCLUDE,
      });
      void actorUserId;
      this.logger.log(`ProductionOrder ${id} CANCELLED (from ${po.status})`);
      return updated;
    });
  }

  async remove(id: string): Promise<void> {
    const po = await this.findById(id);
    if (po.status !== ProductionOrderStatus.PLANNED) {
      throw new BadRequestException('errors.production_order_locked');
    }
    await this.prisma.productionOrder.delete({ where: { id } });
  }
}
