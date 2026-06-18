import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type StudioGarment } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudioGarmentDto } from './dto/create-studio-garment.dto';
import { UpdateStudioGarmentDto } from './dto/update-studio-garment.dto';
import { ListStudioGarmentsQuery } from './dto/list-studio-garments.query';

const ADMIN_INCLUDE = {
  family: { select: { id: true, slug: true, name: true } },
  photos: {
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

@Injectable()
export class StudioGarmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForAdmin(query: ListStudioGarmentsQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.StudioGarmentWhereInput = {
      ...(query.familyId ? { familyId: query.familyId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
    };

    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDir = query.sortDir ?? 'asc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.studioGarment.findMany({
        where,
        include: ADMIN_INCLUDE,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.studioGarment.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findByIdForAdmin(id: string) {
    const row = await this.prisma.studioGarment.findUnique({
      where: { id },
      include: ADMIN_INCLUDE,
    });
    if (!row) throw new NotFoundException('errors.not_found');
    return row;
  }

  async create(dto: CreateStudioGarmentDto): Promise<StudioGarment> {
    await this.assertFamilyExists(dto.familyId);
    return this.prisma.studioGarment.create({
      data: {
        familyId: dto.familyId,
        name: dto.name as unknown as Prisma.InputJsonValue,
        description: dto.description
          ? (dto.description as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateStudioGarmentDto): Promise<StudioGarment> {
    const existing = await this.prisma.studioGarment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');

    if (dto.familyId !== undefined && dto.familyId !== existing.familyId) {
      await this.assertFamilyExists(dto.familyId);
    }

    const data: Prisma.StudioGarmentUpdateInput = {};
    if (dto.familyId !== undefined) {
      data.family = { connect: { id: dto.familyId } };
    }
    if (dto.name !== undefined) data.name = dto.name as unknown as Prisma.InputJsonValue;
    if (dto.description !== undefined) {
      data.description = dto.description as unknown as Prisma.InputJsonValue;
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.studioGarment.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.studioGarment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    await this.prisma.studioGarment.delete({ where: { id } });
  }

  private async assertFamilyExists(familyId: string): Promise<void> {
    const exists = await this.prisma.studioFabricFamily.findUnique({
      where: { id: familyId },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException('errors.not_found');
  }
}
