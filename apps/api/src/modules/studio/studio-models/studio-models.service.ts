import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type StudioModel, type StudioModelAngle } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudioModelDto } from './dto/create-studio-model.dto';
import { UpdateStudioModelDto } from './dto/update-studio-model.dto';
import { ListStudioModelsQuery } from './dto/list-studio-models.query';

const ADMIN_INCLUDE = {
  garment: {
    select: {
      id: true,
      name: true,
      family: { select: { id: true, slug: true, name: true } },
    },
  },
} as const;

@Injectable()
export class StudioModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForAdmin(query: ListStudioModelsQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.StudioModelWhereInput = {
      ...(query.garmentId ? { garmentId: query.garmentId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
    };

    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDir = query.sortDir ?? 'asc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.studioModel.findMany({
        where,
        include: ADMIN_INCLUDE,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.studioModel.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findByIdForAdmin(id: string) {
    const row = await this.prisma.studioModel.findUnique({
      where: { id },
      include: ADMIN_INCLUDE,
    });
    if (!row) throw new NotFoundException('errors.not_found');
    return row;
  }

  async create(dto: CreateStudioModelDto): Promise<StudioModel> {
    await this.assertGarmentExists(dto.garmentId);
    return this.prisma.studioModel.create({
      data: {
        garmentId: dto.garmentId,
        imageKey: dto.imageKey,
        caption: dto.caption
          ? (dto.caption as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        angle: dto.angle ? (dto.angle as StudioModelAngle) : null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateStudioModelDto): Promise<StudioModel> {
    const existing = await this.prisma.studioModel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');

    if (dto.garmentId !== undefined && dto.garmentId !== existing.garmentId) {
      await this.assertGarmentExists(dto.garmentId);
    }

    const data: Prisma.StudioModelUpdateInput = {};
    if (dto.garmentId !== undefined) {
      data.garment = { connect: { id: dto.garmentId } };
    }
    if (dto.imageKey !== undefined) data.imageKey = dto.imageKey;
    if (dto.caption !== undefined) {
      data.caption = dto.caption as unknown as Prisma.InputJsonValue;
    }
    if (dto.angle !== undefined) {
      data.angle = dto.angle ? (dto.angle as StudioModelAngle) : null;
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.studioModel.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.studioModel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    await this.prisma.studioModel.delete({ where: { id } });
  }

  private async assertGarmentExists(garmentId: string): Promise<void> {
    const exists = await this.prisma.studioGarment.findUnique({
      where: { id: garmentId },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException('errors.not_found');
  }
}
