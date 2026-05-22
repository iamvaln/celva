import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ProductAttribute } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAttributeDto } from './dto/create-attribute.dto';
import type { UpdateAttributeDto } from './dto/update-attribute.dto';
import type { ListAttributesQuery } from './dto/list-attributes.query';

export type PaginatedAttributes = {
  data: ProductAttribute[];
  total: number;
  page: number;
  pageSize: number;
};

@Injectable()
export class ProductAttributesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAttributesQuery): Promise<PaginatedAttributes> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where: Prisma.ProductAttributeWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
    };
    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDir = query.sortDir ?? 'asc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.productAttribute.findMany({
        where,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.productAttribute.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findById(id: string): Promise<ProductAttribute> {
    const attr = await this.prisma.productAttribute.findUnique({ where: { id } });
    if (!attr) throw new NotFoundException('errors.not_found');
    return attr;
  }

  async create(dto: CreateAttributeDto): Promise<ProductAttribute> {
    await this.assertProductExists(dto.productId);
    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder(dto.productId));

    try {
      return await this.prisma.productAttribute.create({
        data: {
          name: dto.name as unknown as Prisma.InputJsonValue,
          sortOrder,
          productId: dto.productId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // @@unique([productId, sortOrder]) collision
        throw new ConflictException('errors.attribute_sort_order_taken');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateAttributeDto): Promise<ProductAttribute> {
    const current = await this.findById(id);
    const data: Prisma.ProductAttributeUpdateInput = {};
    if (dto.name) data.name = dto.name as unknown as Prisma.InputJsonValue;
    if (dto.sortOrder !== undefined && dto.sortOrder !== current.sortOrder) {
      data.sortOrder = dto.sortOrder;
    }

    try {
      return await this.prisma.productAttribute.update({ where: { id }, data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('errors.attribute_sort_order_taken');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    // Cascade deletes values and variant-value links (per schema onDelete:Cascade).
    // We block when variants exist to prevent silently breaking active SKUs.
    const variantLinks = await this.prisma.variantAttributeValue.count({
      where: { attributeId: id },
    });
    if (variantLinks > 0) {
      throw new ConflictException('errors.attribute_in_use');
    }
    await this.prisma.productAttribute.delete({ where: { id } });
  }

  private async assertProductExists(productId: string): Promise<void> {
    const exists = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException('errors.product_not_found');
  }

  private async nextSortOrder(productId: string): Promise<number> {
    const last = await this.prisma.productAttribute.findFirst({
      where: { productId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return last ? last.sortOrder + 1 : 0;
  }
}
