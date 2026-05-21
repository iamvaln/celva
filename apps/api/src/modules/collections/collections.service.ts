import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Collection, type ProductCollection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../../common/utils/slugify';
import type { CreateCollectionDto } from './dto/create-collection.dto';
import type { UpdateCollectionDto } from './dto/update-collection.dto';
import type { ListCollectionsQuery } from './dto/list-collections.query';
import type { SetCollectionProductsDto } from './dto/set-collection-products.dto';

export type PaginatedCollections = {
  data: Collection[];
  total: number;
  page: number;
  pageSize: number;
};

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCollectionsQuery): Promise<PaginatedCollections> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where: Prisma.CollectionWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      ...(query.search
        ? {
            OR: [
              { slug: { contains: query.search, mode: 'insensitive' } },
              { name: { path: ['fr'], string_contains: query.search } as Prisma.JsonFilter },
              { name: { path: ['en'], string_contains: query.search } as Prisma.JsonFilter },
            ],
          }
        : {}),
    };

    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDir = query.sortDir ?? 'asc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.collection.findMany({
        where,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.collection.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findById(id: string): Promise<Collection> {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('errors.not_found');
    return collection;
  }

  async findBySlug(slug: string): Promise<Collection> {
    const collection = await this.prisma.collection.findUnique({ where: { slug } });
    if (!collection) throw new NotFoundException('errors.not_found');
    return collection;
  }

  async create(dto: CreateCollectionDto): Promise<Collection> {
    const slug = await this.ensureUniqueSlug(dto.slug ?? slugify(dto.name.fr));
    return this.prisma.collection.create({
      data: {
        name: dto.name as unknown as Prisma.InputJsonValue,
        slug,
        description: (dto.description ?? Prisma.JsonNull) as
          | Prisma.InputJsonValue
          | typeof Prisma.JsonNull,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCollectionDto): Promise<Collection> {
    const current = await this.findById(id);
    const data: Prisma.CollectionUpdateInput = {};
    if (dto.name) data.name = dto.name as unknown as Prisma.InputJsonValue;
    if (dto.description !== undefined) {
      data.description = dto.description as unknown as Prisma.InputJsonValue;
    }
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.slug !== undefined && dto.slug !== current.slug) {
      data.slug = await this.ensureUniqueSlug(dto.slug);
    }
    return this.prisma.collection.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    // ProductCollection has onDelete:Cascade on both sides, so deleting a
    // collection clears its product links automatically (the products
    // themselves survive).
    await this.prisma.collection.delete({ where: { id } });
  }

  async listProducts(collectionId: string): Promise<ProductCollection[]> {
    await this.findById(collectionId);
    return this.prisma.productCollection.findMany({
      where: { collectionId },
      orderBy: [{ sortOrder: 'asc' }, { productId: 'asc' }],
    });
  }

  /**
   * Replace the collection's product list atomically. Items are stored in
   * the order provided (sortOrder = item.sortOrder ?? index).
   */
  async setProducts(
    collectionId: string,
    dto: SetCollectionProductsDto,
  ): Promise<ProductCollection[]> {
    await this.findById(collectionId);

    if (dto.items.length > 0) {
      const found = await this.prisma.product.findMany({
        where: { id: { in: dto.items.map((i) => i.productId) } },
        select: { id: true },
      });
      if (found.length !== dto.items.length) {
        throw new BadRequestException('errors.product_not_found');
      }
    }

    await this.prisma.$transaction([
      this.prisma.productCollection.deleteMany({ where: { collectionId } }),
      ...(dto.items.length > 0
        ? [
            this.prisma.productCollection.createMany({
              data: dto.items.map((item, idx) => ({
                collectionId,
                productId: item.productId,
                sortOrder: item.sortOrder ?? idx,
              })),
            }),
          ]
        : []),
    ]);

    return this.listProducts(collectionId);
  }

  private async ensureUniqueSlug(candidate: string): Promise<string> {
    const normalized = slugify(candidate);
    if (!normalized) throw new BadRequestException('errors.invalid_slug');
    const existing = await this.prisma.collection.findUnique({
      where: { slug: normalized },
      select: { id: true },
    });
    if (existing) throw new ConflictException('errors.slug_already_used');
    return normalized;
  }
}
