import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type StudioModel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudioModelDto } from './dto/create-studio-model.dto';
import { UpdateStudioModelDto } from './dto/update-studio-model.dto';
import { ListStudioModelsQuery } from './dto/list-studio-models.query';

/** Eager hydration used by the public configurator (one round-trip). */
const PUBLIC_INCLUDE = {
  fabrics: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  galleryItems: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

@Injectable()
export class StudioModelsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Public ──────────────────────────────────────────────────────────

  async listPublic(query: ListStudioModelsQuery) {
    return this.listInternal(query, { publicOnly: true });
  }

  async findBySlug(slug: string) {
    const row = await this.prisma.studioModel.findUnique({
      where: { slug },
      include: PUBLIC_INCLUDE,
    });
    if (!row || !row.isActive) throw new NotFoundException('errors.not_found');
    return row;
  }

  // ── Admin ──────────────────────────────────────────────────────────

  async listForAdmin(query: ListStudioModelsQuery) {
    return this.listInternal(query, { publicOnly: false });
  }

  async findByIdForAdmin(id: string) {
    const row = await this.prisma.studioModel.findUnique({
      where: { id },
      include: PUBLIC_INCLUDE,
    });
    if (!row) throw new NotFoundException('errors.not_found');
    return row;
  }

  async create(dto: CreateStudioModelDto): Promise<StudioModel> {
    const slug = (dto.slug ?? this.slugify(dto.name.fr)).trim();
    await this.assertSlugFree(slug);
    return this.prisma.studioModel.create({
      data: {
        slug,
        name: dto.name as unknown as Prisma.InputJsonValue,
        shortDescription: dto.shortDescription
          ? (dto.shortDescription as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        material: dto.material
          ? (dto.material as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        basePrice: new Prisma.Decimal(dto.basePrice),
        delayLabel: dto.delayLabel as unknown as Prisma.InputJsonValue,
        coverImage: dto.coverImage ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateStudioModelDto): Promise<StudioModel> {
    const existing = await this.prisma.studioModel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');

    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      await this.assertSlugFree(dto.slug);
    }

    const data: Prisma.StudioModelUpdateInput = {};
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.name !== undefined) data.name = dto.name as unknown as Prisma.InputJsonValue;
    if (dto.shortDescription !== undefined) {
      data.shortDescription = dto.shortDescription as unknown as Prisma.InputJsonValue;
    }
    if (dto.material !== undefined) {
      data.material = dto.material as unknown as Prisma.InputJsonValue;
    }
    if (dto.basePrice !== undefined) data.basePrice = new Prisma.Decimal(dto.basePrice);
    if (dto.delayLabel !== undefined) {
      data.delayLabel = dto.delayLabel as unknown as Prisma.InputJsonValue;
    }
    if (dto.coverImage !== undefined) data.coverImage = dto.coverImage || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    return this.prisma.studioModel.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.studioModel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    await this.prisma.studioModel.delete({ where: { id } });
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private async listInternal(
    query: ListStudioModelsQuery,
    opts: { publicOnly: boolean },
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.StudioModelWhereInput = {
      ...(opts.publicOnly ? { isActive: true } : {}),
      ...(!opts.publicOnly && query.isActive !== undefined
        ? { isActive: query.isActive === 'true' }
        : {}),
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
    };

    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDir = query.sortDir ?? 'asc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.studioModel.findMany({
        where,
        include: opts.publicOnly ? PUBLIC_INCLUDE : undefined,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.studioModel.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  private async assertSlugFree(slug: string): Promise<void> {
    const exists = await this.prisma.studioModel.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (exists) throw new ConflictException('errors.slug_already_used');
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
}
