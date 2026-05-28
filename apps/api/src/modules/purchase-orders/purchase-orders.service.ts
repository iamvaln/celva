import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PurchaseOrderStatus,
  type PurchaseOrder,
  type PurchaseOrderCostType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePurchaseOrderDto,
  PurchaseOrderCostDto,
  PurchaseOrderItemDto,
} from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { ListPurchaseOrdersQuery } from './dto/list-purchase-orders.query';

const INCLUDE = {
  supplier: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  items: {
    include: {
      rawMaterial: { select: { id: true, name: true, unit: true } },
    },
  },
  costs: true,
} as const;

/**
 * Spec §5.3. Supplier purchase orders.
 *   DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED  (or → CANCELLED)
 * DRAFT is freely editable. ORDERED+ is locked (cancel only, and only
 * while nothing's been received). Reception is line-by-line and
 * increments RawMaterial.stockQty directly (raw materials aren't
 * ProductVariants, so they don't flow through StockMovementsService).
 * A single EXPENSE / RAW_MATERIALS Transaction is booked when the PO
 * first reaches RECEIVED, covering items + ancillary costs.
 */
@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Reads ───────────────────────────────────────────────────────────

  async list(query: ListPurchaseOrdersQuery): Promise<{
    data: PurchaseOrder[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.PurchaseOrderWhereInput = {
      ...(query.status ? { status: query.status as PurchaseOrderStatus } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lt: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDir ?? 'desc';
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async findById(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!po) throw new NotFoundException('errors.not_found');
    return po;
  }

  // ── Create / update (DRAFT only) ────────────────────────────────────

  async create(dto: CreatePurchaseOrderDto, actorUserId: string): Promise<PurchaseOrder> {
    await this.assertSupplier(dto.supplierId);
    await this.assertMaterials(dto.items);

    const total = this.computeTotal(dto.items, dto.costs ?? []);

    return this.prisma.purchaseOrder.create({
      data: {
        supplierId: dto.supplierId,
        createdById: actorUserId,
        notes: dto.notes ?? null,
        status: PurchaseOrderStatus.DRAFT,
        totalAmount: total,
        items: {
          create: dto.items.map((it) => ({
            rawMaterialId: it.rawMaterialId,
            quantity: new Prisma.Decimal(it.quantity),
            unitPrice: new Prisma.Decimal(it.unitPrice),
          })),
        },
        costs: {
          create: (dto.costs ?? []).map((c) => ({
            type: c.type as PurchaseOrderCostType,
            amount: new Prisma.Decimal(c.amount),
            description: c.description ?? null,
          })),
        },
      },
      include: INCLUDE,
    });
  }

  async update(id: string, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    const po = await this.findById(id);
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('errors.purchase_order_locked');
    }
    if (dto.supplierId) await this.assertSupplier(dto.supplierId);
    if (dto.items) await this.assertMaterials(dto.items);

    return this.prisma.$transaction(async (tx) => {
      // Replace items / costs wholesale when provided.
      if (dto.items) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        await tx.purchaseOrderItem.createMany({
          data: dto.items.map((it) => ({
            purchaseOrderId: id,
            rawMaterialId: it.rawMaterialId,
            quantity: new Prisma.Decimal(it.quantity),
            unitPrice: new Prisma.Decimal(it.unitPrice),
          })),
        });
      }
      if (dto.costs) {
        await tx.purchaseOrderCost.deleteMany({ where: { purchaseOrderId: id } });
        await tx.purchaseOrderCost.createMany({
          data: dto.costs.map((c) => ({
            purchaseOrderId: id,
            type: c.type as PurchaseOrderCostType,
            amount: new Prisma.Decimal(c.amount),
            description: c.description ?? null,
          })),
        });
      }

      // Recompute total from the post-edit state.
      const items = dto.items
        ? dto.items
        : (await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } })).map((i) => ({
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
          }));
      const costs = dto.costs
        ? dto.costs
        : (await tx.purchaseOrderCost.findMany({ where: { purchaseOrderId: id } })).map((c) => ({
            amount: Number(c.amount),
          }));
      const total = this.computeTotal(
        items as PurchaseOrderItemDto[],
        costs as PurchaseOrderCostDto[],
      );

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(dto.supplierId ? { supplierId: dto.supplierId } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
          totalAmount: total,
        },
        include: INCLUDE,
      });
    });
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  async order(id: string): Promise<PurchaseOrder> {
    const po = await this.findById(id);
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('errors.purchase_order_not_draft');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.ORDERED },
      include: INCLUDE,
    });
  }

  /**
   * Line-by-line reception. quantityReceived in the payload is the new
   * CUMULATIVE total per item. We apply the delta to RawMaterial.stockQty.
   * When every line is fully received → RECEIVED + book the EXPENSE;
   * otherwise PARTIALLY_RECEIVED.
   */
  async receive(
    id: string,
    dto: ReceivePurchaseOrderDto,
    actorUserId: string,
  ): Promise<PurchaseOrder> {
    const po = await this.findById(id);
    if (
      po.status !== PurchaseOrderStatus.ORDERED &&
      po.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
    ) {
      throw new BadRequestException('errors.purchase_order_not_receivable');
    }

    const itemMap = new Map(po.items.map((it) => [it.id, it]));
    for (const incoming of dto.items) {
      const item = itemMap.get(incoming.id);
      if (!item) throw new BadRequestException('errors.purchase_order_item_not_found');
      if (incoming.quantityReceived < Number(item.quantityReceived)) {
        throw new BadRequestException('errors.purchase_order_received_decrease');
      }
      if (incoming.quantityReceived > Number(item.quantity)) {
        throw new BadRequestException('errors.purchase_order_received_overflow');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const incoming of dto.items) {
        const item = itemMap.get(incoming.id)!;
        const delta = incoming.quantityReceived - Number(item.quantityReceived);
        if (delta > 0) {
          await tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: { quantityReceived: new Prisma.Decimal(incoming.quantityReceived) },
          });
          await tx.rawMaterial.update({
            where: { id: item.rawMaterialId },
            data: { stockQty: { increment: new Prisma.Decimal(delta) } },
          });
        }
      }

      // Re-read items to decide full vs partial.
      const refreshed = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });
      const fullyReceived = refreshed.every((it) =>
        it.quantityReceived.greaterThanOrEqualTo(it.quantity),
      );
      const nextStatus = fullyReceived
        ? PurchaseOrderStatus.RECEIVED
        : PurchaseOrderStatus.PARTIALLY_RECEIVED;

      // Book the EXPENSE once, the first time we hit RECEIVED.
      if (fullyReceived) {
        const existing = await tx.transaction.count({ where: { purchaseOrderId: id } });
        if (existing === 0) {
          await tx.transaction.create({
            data: {
              type: 'EXPENSE',
              category: 'RAW_MATERIALS',
              amount: po.totalAmount,
              description: `Achat matières — PO ${po.id} (${po.supplier.name})`,
              date: new Date(),
              createdById: actorUserId,
              purchaseOrderId: id,
            },
          });
        }
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: nextStatus },
        include: INCLUDE,
      });
      this.logger.log(`PurchaseOrder ${id} reception → ${nextStatus}`);
      return updated;
    });
  }

  async cancel(id: string): Promise<PurchaseOrder> {
    const po = await this.findById(id);
    if (
      po.status === PurchaseOrderStatus.RECEIVED ||
      po.status === PurchaseOrderStatus.CANCELLED
    ) {
      throw new BadRequestException('errors.purchase_order_not_cancellable');
    }
    const anyReceived = po.items.some((it) => Number(it.quantityReceived) > 0);
    if (anyReceived) {
      throw new BadRequestException('errors.purchase_order_partially_received');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CANCELLED },
      include: INCLUDE,
    });
  }

  async remove(id: string): Promise<void> {
    const po = await this.findById(id);
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('errors.purchase_order_locked');
    }
    await this.prisma.purchaseOrder.delete({ where: { id } });
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private computeTotal(
    items: Array<{ quantity: number; unitPrice: number }>,
    costs: Array<{ amount: number }>,
  ): Prisma.Decimal {
    let total = new Prisma.Decimal(0);
    for (const it of items) {
      total = total.plus(new Prisma.Decimal(it.quantity).mul(it.unitPrice));
    }
    for (const c of costs) {
      total = total.plus(c.amount);
    }
    return total;
  }

  private async assertSupplier(supplierId: string): Promise<void> {
    const s = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });
    if (!s) throw new BadRequestException('errors.supplier_not_found');
  }

  private async assertMaterials(items: Array<{ rawMaterialId: string }>): Promise<void> {
    const ids = [...new Set(items.map((i) => i.rawMaterialId))];
    const found = await this.prisma.rawMaterial.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      throw new BadRequestException('errors.raw_material_not_found');
    }
  }
}
