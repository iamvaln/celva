import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type SizeGuide } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSizeGuideDto } from './dto/create-size-guide.dto';
import { UpdateSizeGuideDto } from './dto/update-size-guide.dto';
import { ListSizeGuidesQuery } from './dto/list-size-guides.query';

const INCLUDE = {
  category: { select: { id: true, slug: true, name: true } },
} as const;

@Injectable()
export class SizeGuidesService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────
  // Public (storefront)
  // ──────────────────────────────────────────────────────────────────────

  /** Flat list of every guide with its category — feeds the /guides-tailles page. */
  listPublic(): Promise<SizeGuide[]> {
    return this.prisma.sizeGuide.findMany({
      include: INCLUDE,
      orderBy: { category: { sortOrder: 'asc' } },
    });
  }

  listByCategory(categoryId: string): Promise<SizeGuide[]> {
    return this.prisma.sizeGuide.findMany({
      where: { categoryId },
      include: INCLUDE,
      orderBy: { id: 'asc' },
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Admin
  // ──────────────────────────────────────────────────────────────────────

  async listForAdmin(query: ListSizeGuidesQuery): Promise<{
    data: SizeGuide[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.SizeGuideWhereInput = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { path: ['fr'], string_contains: query.search } as Prisma.JsonFilter },
              { name: { path: ['en'], string_contains: query.search } as Prisma.JsonFilter },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.sizeGuide.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ categoryId: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sizeGuide.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findByIdForAdmin(id: string): Promise<SizeGuide> {
    const guide = await this.prisma.sizeGuide.findUnique({ where: { id }, include: INCLUDE });
    if (!guide) throw new NotFoundException('errors.not_found');
    return guide;
  }

  async create(dto: CreateSizeGuideDto): Promise<SizeGuide> {
    await this.assertCategoryExists(dto.categoryId);
    return this.prisma.sizeGuide.create({
      data: {
        name: dto.name as unknown as Prisma.JsonObject,
        content: dto.content as unknown as Prisma.JsonObject,
        categoryId: dto.categoryId,
      },
      include: INCLUDE,
    });
  }

  async update(id: string, dto: UpdateSizeGuideDto): Promise<SizeGuide> {
    const existing = await this.prisma.sizeGuide.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    if (dto.categoryId !== undefined && dto.categoryId !== existing.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }

    const data: Prisma.SizeGuideUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name as unknown as Prisma.JsonObject;
    if (dto.content !== undefined) data.content = dto.content as unknown as Prisma.JsonObject;
    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } };
    }

    return this.prisma.sizeGuide.update({ where: { id }, data, include: INCLUDE });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.sizeGuide.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    await this.prisma.sizeGuide.delete({ where: { id } });
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('errors.category_not_found');
  }
}
