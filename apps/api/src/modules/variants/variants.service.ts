import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ProductVariant, type StockMovement } from '@prisma/client';
import { STOCK_MOVEMENT_TYPE } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import type { CreateVariantDto } from './dto/create-variant.dto';
import type { UpdateVariantDto } from './dto/update-variant.dto';
import type { ListVariantsQuery } from './dto/list-variants.query';
import type { AdjustStockDto } from './dto/adjust-stock.dto';

type VariantWithAttributeValues = ProductVariant & {
  attributeValues: { attributeId: string; attributeValueId: string }[];
};

export type PaginatedVariants = {
  data: VariantWithAttributeValues[];
  total: number;
  page: number;
  pageSize: number;
};

@Injectable()
export class VariantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovements: StockMovementsService,
  ) {}

  async list(query: ListVariantsQuery): Promise<PaginatedVariants> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where: Prisma.ProductVariantWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      ...(query.search
        ? { sku: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDir ?? 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.productVariant.findMany({
        where,
        include: {
          attributeValues: { select: { attributeId: true, attributeValueId: true } },
        },
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.productVariant.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findById(id: string): Promise<VariantWithAttributeValues> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        attributeValues: { select: { attributeId: true, attributeValueId: true } },
      },
    });
    if (!variant) throw new NotFoundException('errors.not_found');
    return variant;
  }

  async create(dto: CreateVariantDto, userId: string): Promise<VariantWithAttributeValues> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        attributes: { include: { values: true } },
      },
    });
    if (!product) throw new BadRequestException('errors.product_not_found');

    const links = await this.resolveAttributeLinks(product.attributes, dto.attributeValueIds);

    await this.assertCombinationFree(product.id, dto.attributeValueIds);
    await this.assertSkuFree(dto.sku);

    const variant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productVariant.create({
        data: {
          sku: dto.sku,
          stock: 0,
          consignedStock: 0,
          priceOverride: dto.priceOverride,
          storageLocation: dto.storageLocation ?? null,
          isActive: dto.isActive ?? true,
          productId: dto.productId,
          attributeValues: {
            create: links.map((l) => ({
              attributeId: l.attributeId,
              attributeValueId: l.attributeValueId,
            })),
          },
        },
        include: {
          attributeValues: { select: { attributeId: true, attributeValueId: true } },
        },
      });

      if (dto.initialStock && dto.initialStock > 0) {
        await this.stockMovements.apply({
          variantId: created.id,
          quantity: dto.initialStock,
          type: STOCK_MOVEMENT_TYPE.MANUAL_ADJUSTMENT,
          userId,
          reason: 'Initial stock on variant creation',
          tx,
        });
      }

      return created;
    });

    // Re-fetch so the returned stock reflects the initial movement.
    return this.findById(variant.id);
  }

  async update(id: string, dto: UpdateVariantDto): Promise<VariantWithAttributeValues> {
    await this.findById(id);
    if (dto.sku) await this.assertSkuFree(dto.sku, id);

    await this.prisma.productVariant.update({
      where: { id },
      data: {
        ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
        ...(dto.priceOverride !== undefined ? { priceOverride: dto.priceOverride } : {}),
        ...(dto.storageLocation !== undefined ? { storageLocation: dto.storageLocation } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const variant = await this.findById(id);
    const [orders, carts, wishlists, consignments, movements] = await this.prisma.$transaction([
      this.prisma.orderItem.count({ where: { variantId: id } }),
      this.prisma.cartItem.count({ where: { variantId: id } }),
      this.prisma.wishlistItem.count({ where: { variantId: id } }),
      this.prisma.consignmentItem.count({ where: { variantId: id } }),
      this.prisma.stockMovement.count({ where: { variantId: id } }),
    ]);
    if (orders + carts + wishlists + consignments > 0) {
      throw new ConflictException('errors.variant_in_use');
    }
    if (variant.stock > 0) {
      throw new ConflictException('errors.variant_has_stock');
    }
    if (movements > 0) {
      // StockMovement is the audit trail. Once any stock has flowed through
      // this variant, hard-delete is forbidden — deactivate via PATCH
      // { isActive:false } instead.
      throw new ConflictException('errors.variant_has_movements');
    }
    await this.prisma.productVariant.delete({ where: { id } });
  }

  async adjustStock(id: string, dto: AdjustStockDto, userId: string): Promise<StockMovement> {
    await this.findById(id);
    return this.stockMovements.apply({
      variantId: id,
      quantity: dto.quantity,
      type: STOCK_MOVEMENT_TYPE.MANUAL_ADJUSTMENT,
      userId,
      reason: dto.comment ? `${dto.reason} — ${dto.comment}` : dto.reason,
    });
  }

  /**
   * Resolves the picks: every product attribute must be covered exactly once,
   * and every picked attributeValueId must belong to one of those attributes.
   */
  private async resolveAttributeLinks(
    productAttributes: Array<{ id: string; values: { id: string }[] }>,
    pickedValueIds: string[],
  ): Promise<{ attributeId: string; attributeValueId: string }[]> {
    if (productAttributes.length === 0) {
      // Product has no axes — variants with no attributes are allowed.
      if (pickedValueIds.length > 0) {
        throw new BadRequestException('errors.variant_attribute_mismatch');
      }
      return [];
    }

    if (pickedValueIds.length !== productAttributes.length) {
      throw new BadRequestException('errors.variant_attribute_mismatch');
    }

    const links: { attributeId: string; attributeValueId: string }[] = [];
    const remaining = new Set(productAttributes.map((a) => a.id));

    for (const valueId of pickedValueIds) {
      const owner = productAttributes.find((a) => a.values.some((v) => v.id === valueId));
      if (!owner) throw new BadRequestException('errors.variant_attribute_value_invalid');
      if (!remaining.has(owner.id)) {
        // Two picks belong to the same attribute — duplicate axis.
        throw new BadRequestException('errors.variant_attribute_duplicate_axis');
      }
      remaining.delete(owner.id);
      links.push({ attributeId: owner.id, attributeValueId: valueId });
    }

    return links;
  }

  /**
   * Spec §4.3: no two variants of the same product can have the exact same
   * combination. We compare value-id sets; order is irrelevant.
   */
  private async assertCombinationFree(productId: string, valueIds: string[]): Promise<void> {
    if (valueIds.length === 0) {
      const existing = await this.prisma.productVariant.findFirst({
        where: { productId, attributeValues: { none: {} } },
        select: { id: true },
      });
      if (existing) throw new ConflictException('errors.variant_combination_exists');
      return;
    }

    const candidates = await this.prisma.productVariant.findMany({
      where: {
        productId,
        attributeValues: { some: { attributeValueId: { in: valueIds } } },
      },
      select: {
        id: true,
        attributeValues: { select: { attributeValueId: true } },
      },
    });

    const sortedTarget = [...valueIds].sort();
    const targetKey = sortedTarget.join('|');

    for (const variant of candidates) {
      const ids = variant.attributeValues.map((av) => av.attributeValueId).sort();
      if (ids.length === sortedTarget.length && ids.join('|') === targetKey) {
        throw new ConflictException('errors.variant_combination_exists');
      }
    }
  }

  private async assertSkuFree(sku: string, ignoreId?: string): Promise<void> {
    const existing = await this.prisma.productVariant.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('errors.sku_already_used');
    }
  }
}
