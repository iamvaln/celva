import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type StudioFabricFamily } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudioFamilyDto } from './dto/create-studio-family.dto';
import { UpdateStudioFamilyDto } from './dto/update-studio-family.dto';
import { ListStudioFamiliesQuery } from './dto/list-studio-families.query';

/**
 * Eager hydration for /studio/families (public): active fabrics + active
 * garments with their active photos, sorted. One round trip serves the
 * whole storefront /studio page.
 */
const PUBLIC_INCLUDE = {
  fabrics: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  garments: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' as const },
    include: {
      photos: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
  },
} as const;

@Injectable()
export class StudioFamiliesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Public ──────────────────────────────────────────────────────────

  async listPublic(query: ListStudioFamiliesQuery) {
    return this.listInternal(query, { publicOnly: true });
  }

  async findBySlug(slug: string) {
    const row = await this.prisma.studioFabricFamily.findUnique({
      where: { slug },
      include: PUBLIC_INCLUDE,
    });
    if (!row || !row.isActive) throw new NotFoundException('errors.not_found');
    return row;
  }

  // ── Admin ──────────────────────────────────────────────────────────

  async listForAdmin(query: ListStudioFamiliesQuery) {
    return this.listInternal(query, { publicOnly: false });
  }

  async findByIdForAdmin(id: string) {
    const row = await this.prisma.studioFabricFamily.findUnique({
      where: { id },
      include: PUBLIC_INCLUDE,
    });
    if (!row) throw new NotFoundException('errors.not_found');
    return row;
  }

  async create(dto: CreateStudioFamilyDto): Promise<StudioFabricFamily> {
    const slug = (dto.slug ?? this.slugify(dto.name.fr)).trim();
    await this.assertSlugFree(slug);
    return this.prisma.studioFabricFamily.create({
      data: {
        slug,
        name: dto.name as unknown as Prisma.InputJsonValue,
        description: dto.description
          ? (dto.description as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        coverImage: dto.coverImage ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateStudioFamilyDto): Promise<StudioFabricFamily> {
    const existing = await this.prisma.studioFabricFamily.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');

    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      await this.assertSlugFree(dto.slug);
    }

    const data: Prisma.StudioFabricFamilyUpdateInput = {};
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.name !== undefined) data.name = dto.name as unknown as Prisma.InputJsonValue;
    if (dto.description !== undefined) {
      data.description = dto.description as unknown as Prisma.InputJsonValue;
    }
    if (dto.coverImage !== undefined) data.coverImage = dto.coverImage || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    return this.prisma.studioFabricFamily.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.studioFabricFamily.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    await this.prisma.studioFabricFamily.delete({ where: { id } });
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private async listInternal(
    query: ListStudioFamiliesQuery,
    opts: { publicOnly: boolean },
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.StudioFabricFamilyWhereInput = {
      ...(opts.publicOnly ? { isActive: true } : {}),
      ...(!opts.publicOnly && query.isActive !== undefined
        ? { isActive: query.isActive === 'true' }
        : {}),
    };

    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDir = query.sortDir ?? 'asc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.studioFabricFamily.findMany({
        where,
        include: PUBLIC_INCLUDE,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.studioFabricFamily.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  private async assertSlugFree(slug: string): Promise<void> {
    const taken = await this.prisma.studioFabricFamily.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (taken) throw new ConflictException('errors.slug_taken');
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }
}
