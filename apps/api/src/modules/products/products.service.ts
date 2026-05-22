import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Product } from '@prisma/client';
import { COMMISSION_TYPE, type ProductionType, type CommissionType } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../../common/utils/slugify';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type { ListProductsQuery } from './dto/list-products.query';

export type PaginatedProducts = {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProductsQuery): Promise<PaginatedProducts> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.ProductWhereInput = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.productionType ? { productionType: query.productionType as ProductionType } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      ...(query.search
        ? {
            OR: [
              { slug: { contains: query.search, mode: 'insensitive' } },
              {
                name: { path: ['fr'], string_contains: query.search } as Prisma.JsonFilter,
              },
              {
                name: { path: ['en'], string_contains: query.search } as Prisma.JsonFilter,
              },
            ],
          }
        : {}),
    };

    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDir ?? 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findById(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('errors.not_found');
    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product) throw new NotFoundException('errors.not_found');
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    this.assertPriceCoherence(dto.displayPrice, dto.floorPrice);
    await this.assertCategoryExists(dto.categoryId);

    const slug = await this.ensureUniqueSlug(dto.slug ?? slugify(dto.name.fr));

    return this.prisma.product.create({
      data: {
        name: dto.name as unknown as Prisma.InputJsonValue,
        slug,
        description: (dto.description ?? Prisma.JsonNull) as
          | Prisma.InputJsonValue
          | typeof Prisma.JsonNull,
        displayPrice: dto.displayPrice,
        floorPrice: dto.floorPrice,
        costPrice: dto.costPrice ?? 0,
        productionType: dto.productionType as ProductionType,
        defaultCommissionType: (dto.defaultCommissionType ?? COMMISSION_TYPE.PERCENTAGE) as CommissionType,
        defaultCommissionValue: dto.defaultCommissionValue ?? 0,
        isActive: dto.isActive ?? true,
        categoryId: dto.categoryId,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const current = await this.findById(id);

    const nextDisplay = dto.displayPrice ?? Number(current.displayPrice);
    const nextFloor = dto.floorPrice ?? Number(current.floorPrice);
    this.assertPriceCoherence(nextDisplay, nextFloor);

    if (dto.categoryId && dto.categoryId !== current.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }

    const data: Prisma.ProductUpdateInput = {};
    if (dto.name) data.name = dto.name as unknown as Prisma.InputJsonValue;
    if (dto.description !== undefined) {
      data.description = dto.description as unknown as Prisma.InputJsonValue;
    }
    if (dto.displayPrice !== undefined) data.displayPrice = dto.displayPrice;
    if (dto.floorPrice !== undefined) data.floorPrice = dto.floorPrice;
    if (dto.costPrice !== undefined) data.costPrice = dto.costPrice;
    if (dto.productionType !== undefined) {
      data.productionType = dto.productionType as ProductionType;
    }
    if (dto.defaultCommissionType !== undefined) {
      data.defaultCommissionType = dto.defaultCommissionType as CommissionType;
    }
    if (dto.defaultCommissionValue !== undefined) {
      data.defaultCommissionValue = dto.defaultCommissionValue;
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } };
    }
    if (dto.slug !== undefined && dto.slug !== current.slug) {
      data.slug = await this.ensureUniqueSlug(dto.slug);
    }

    return this.prisma.product.update({ where: { id }, data });
  }

  /**
   * Spec §4.2: duplication. Copies everything except variants/images/related
   * (those belong to the variants/images/cross-sell batches). Slug becomes
   * `<original>-copy` (then `-copy-2`, `-copy-3`…), product is set inactive
   * by default so it doesn't surface on the storefront before review.
   */
  async duplicate(id: string): Promise<Product> {
    const source = await this.findById(id);
    const baseSlug = `${source.slug}-copy`;
    const slug = await this.ensureUniqueSlug(baseSlug, { autoSuffix: true });

    return this.prisma.product.create({
      data: {
        name: source.name as Prisma.InputJsonValue,
        slug,
        description: (source.description ?? Prisma.JsonNull) as
          | Prisma.InputJsonValue
          | typeof Prisma.JsonNull,
        displayPrice: source.displayPrice,
        floorPrice: source.floorPrice,
        costPrice: source.costPrice,
        productionType: source.productionType,
        defaultCommissionType: source.defaultCommissionType,
        defaultCommissionValue: source.defaultCommissionValue,
        isActive: false,
        categoryId: source.categoryId,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        // FK violation: product is referenced (variants, order items, etc.)
        throw new ConflictException('errors.product_in_use');
      }
      throw err;
    }
  }

  private assertPriceCoherence(displayPrice: number, floorPrice: number): void {
    if (displayPrice < floorPrice) {
      throw new BadRequestException('errors.display_below_floor');
    }
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const exists = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException('errors.category_not_found');
  }

  /**
   * Ensures a slug is unique. When `autoSuffix` is true, on collision we
   * append -2, -3, … instead of throwing — used by duplicate().
   */
  private async ensureUniqueSlug(
    candidate: string,
    options: { autoSuffix?: boolean } = {},
  ): Promise<string> {
    const base = slugify(candidate);
    if (!base) throw new BadRequestException('errors.invalid_slug');

    if (!options.autoSuffix) {
      const existing = await this.prisma.product.findUnique({
        where: { slug: base },
        select: { id: true },
      });
      if (existing) throw new ConflictException('errors.slug_already_used');
      return base;
    }

    let candidateSlug = base;
    let suffix = 2;
    while (
      await this.prisma.product.findUnique({
        where: { slug: candidateSlug },
        select: { id: true },
      })
    ) {
      candidateSlug = `${base}-${suffix++}`;
      if (suffix > 999) throw new ConflictException('errors.slug_already_used');
    }
    return candidateSlug;
  }
}
