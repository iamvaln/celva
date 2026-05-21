import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../../common/utils/slugify';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';
import type { ListCategoriesQuery } from './dto/list-categories.query';

export type PaginatedCategories = {
  data: Category[];
  total: number;
  page: number;
  pageSize: number;
};

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCategoriesQuery): Promise<PaginatedCategories> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where: Prisma.CategoryWhereInput = {
      ...(query.search
        ? {
            OR: [
              { slug: { contains: query.search, mode: 'insensitive' } },
              {
                name: {
                  path: ['fr'],
                  string_contains: query.search,
                } as Prisma.JsonFilter,
              },
              {
                name: {
                  path: ['en'],
                  string_contains: query.search,
                } as Prisma.JsonFilter,
              },
            ],
          }
        : {}),
      ...(query.hasActiveProducts === 'true'
        ? { products: { some: { isActive: true } } }
        : {}),
    };

    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDir = query.sortDir ?? 'asc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.category.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findById(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('errors.not_found');
    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException('errors.not_found');
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = await this.ensureUniqueSlug(dto.slug ?? slugify(dto.name.fr));
    return this.prisma.category.create({
      data: {
        name: dto.name as unknown as Prisma.InputJsonValue,
        slug,
        description: (dto.description ?? Prisma.JsonNull) as
          | Prisma.InputJsonValue
          | typeof Prisma.JsonNull,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const current = await this.findById(id);
    const data: Prisma.CategoryUpdateInput = {};

    if (dto.name) data.name = dto.name as unknown as Prisma.InputJsonValue;
    if (dto.description !== undefined) {
      data.description = dto.description as unknown as Prisma.InputJsonValue;
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    if (dto.slug !== undefined && dto.slug !== current.slug) {
      data.slug = await this.ensureUniqueSlug(dto.slug);
    }

    return this.prisma.category.update({ where: { id }, data });
  }

  /**
   * Spec §4.1: deletion forbidden if the category still contains products.
   * Caller must reassign or delete products first.
   */
  async remove(id: string): Promise<void> {
    await this.findById(id);
    const productCount = await this.prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new ConflictException('errors.category_has_products');
    }
    await this.prisma.category.delete({ where: { id } });
  }

  private async ensureUniqueSlug(candidate: string): Promise<string> {
    const normalized = slugify(candidate);
    if (!normalized) throw new BadRequestException('errors.invalid_slug');
    const existing = await this.prisma.category.findUnique({
      where: { slug: normalized },
      select: { id: true },
    });
    if (existing) throw new ConflictException('errors.slug_already_used');
    return normalized;
  }
}
