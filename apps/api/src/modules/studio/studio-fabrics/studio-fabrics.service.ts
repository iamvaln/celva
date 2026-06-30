import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type StudioFabric } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudioFabricDto } from './dto/create-studio-fabric.dto';
import { UpdateStudioFabricDto } from './dto/update-studio-fabric.dto';
import { ListStudioFabricsQuery } from './dto/list-studio-fabrics.query';

const ADMIN_INCLUDE = {
  family: { select: { id: true, slug: true, name: true } },
} as const;

@Injectable()
export class StudioFabricsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForAdmin(query: ListStudioFabricsQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.StudioFabricWhereInput = {
      ...(query.familyId ? { familyId: query.familyId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
    };

    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDir = query.sortDir ?? 'asc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.studioFabric.findMany({
        where,
        include: ADMIN_INCLUDE,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.studioFabric.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findByIdForAdmin(id: string) {
    const row = await this.prisma.studioFabric.findUnique({
      where: { id },
      include: ADMIN_INCLUDE,
    });
    if (!row) throw new NotFoundException('errors.not_found');
    return row;
  }

  async create(dto: CreateStudioFabricDto): Promise<StudioFabric> {
    await this.assertFamilyExists(dto.familyId);
    return this.prisma.studioFabric.create({
      data: {
        familyId: dto.familyId,
        name: dto.name as unknown as Prisma.InputJsonValue,
        swatchImage: dto.swatchImage ?? null,
        photoImage: dto.photoImage ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateStudioFabricDto): Promise<StudioFabric> {
    const existing = await this.prisma.studioFabric.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');

    if (dto.familyId !== undefined && dto.familyId !== existing.familyId) {
      await this.assertFamilyExists(dto.familyId);
    }

    const data: Prisma.StudioFabricUpdateInput = {};
    if (dto.familyId !== undefined) {
      data.family = { connect: { id: dto.familyId } };
    }
    if (dto.name !== undefined) data.name = dto.name as unknown as Prisma.InputJsonValue;
    if (dto.swatchImage !== undefined) data.swatchImage = dto.swatchImage || null;
    if (dto.photoImage !== undefined) data.photoImage = dto.photoImage || null;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.studioFabric.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.studioFabric.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    await this.prisma.studioFabric.delete({ where: { id } });
  }

  private async assertFamilyExists(familyId: string): Promise<void> {
    const exists = await this.prisma.studioFabricFamily.findUnique({
      where: { id: familyId },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException('errors.not_found');
  }
}
