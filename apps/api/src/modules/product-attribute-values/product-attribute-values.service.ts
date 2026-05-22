import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ProductAttributeValue } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAttributeValueDto } from './dto/create-attribute-value.dto';
import type { UpdateAttributeValueDto } from './dto/update-attribute-value.dto';
import type { ListAttributeValuesQuery } from './dto/list-attribute-values.query';

export type PaginatedAttributeValues = {
  data: ProductAttributeValue[];
  total: number;
  page: number;
  pageSize: number;
};

@Injectable()
export class ProductAttributeValuesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAttributeValuesQuery): Promise<PaginatedAttributeValues> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 100;
    const where: Prisma.ProductAttributeValueWhereInput = {
      ...(query.attributeId ? { attributeId: query.attributeId } : {}),
    };
    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDir = query.sortDir ?? 'asc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.productAttributeValue.findMany({
        where,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.productAttributeValue.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findById(id: string): Promise<ProductAttributeValue> {
    const value = await this.prisma.productAttributeValue.findUnique({ where: { id } });
    if (!value) throw new NotFoundException('errors.not_found');
    return value;
  }

  async create(dto: CreateAttributeValueDto): Promise<ProductAttributeValue> {
    await this.assertAttributeExists(dto.attributeId);
    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder(dto.attributeId));

    try {
      return await this.prisma.productAttributeValue.create({
        data: {
          value: dto.value as unknown as Prisma.InputJsonValue,
          sortOrder,
          attributeId: dto.attributeId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('errors.attribute_value_sort_order_taken');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateAttributeValueDto): Promise<ProductAttributeValue> {
    const current = await this.findById(id);
    const data: Prisma.ProductAttributeValueUpdateInput = {};
    if (dto.value) data.value = dto.value as unknown as Prisma.InputJsonValue;
    if (dto.sortOrder !== undefined && dto.sortOrder !== current.sortOrder) {
      data.sortOrder = dto.sortOrder;
    }

    try {
      return await this.prisma.productAttributeValue.update({ where: { id }, data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('errors.attribute_value_sort_order_taken');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    const variantLinks = await this.prisma.variantAttributeValue.count({
      where: { attributeValueId: id },
    });
    if (variantLinks > 0) {
      throw new ConflictException('errors.attribute_value_in_use');
    }
    await this.prisma.productAttributeValue.delete({ where: { id } });
  }

  private async assertAttributeExists(attributeId: string): Promise<void> {
    const exists = await this.prisma.productAttribute.findUnique({
      where: { id: attributeId },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException('errors.attribute_not_found');
  }

  private async nextSortOrder(attributeId: string): Promise<number> {
    const last = await this.prisma.productAttributeValue.findFirst({
      where: { attributeId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return last ? last.sortOrder + 1 : 0;
  }
}
