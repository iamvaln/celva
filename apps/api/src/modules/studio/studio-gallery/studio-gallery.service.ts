import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type StudioGalleryItem } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudioGalleryItemDto } from './dto/create-studio-gallery-item.dto';
import { UpdateStudioGalleryItemDto } from './dto/update-studio-gallery-item.dto';
import { ListStudioGalleryQuery } from './dto/list-studio-gallery.query';

const MODEL_INCLUDE = {
  model: { select: { id: true, slug: true, name: true } },
} as const;

@Injectable()
export class StudioGalleryService {
  constructor(private readonly prisma: PrismaService) {}

  async listForAdmin(query: ListStudioGalleryQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.StudioGalleryItemWhereInput = {
      ...(query.modelId ? { modelId: query.modelId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
    };

    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDir = query.sortDir ?? 'asc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.studioGalleryItem.findMany({
        where,
        include: MODEL_INCLUDE,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.studioGalleryItem.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findByIdForAdmin(id: string) {
    const row = await this.prisma.studioGalleryItem.findUnique({
      where: { id },
      include: MODEL_INCLUDE,
    });
    if (!row) throw new NotFoundException('errors.not_found');
    return row;
  }

  async create(dto: CreateStudioGalleryItemDto): Promise<StudioGalleryItem> {
    await this.assertModelExists(dto.modelId);
    return this.prisma.studioGalleryItem.create({
      data: {
        modelId: dto.modelId,
        imageKey: dto.imageKey,
        caption: dto.caption
          ? (dto.caption as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        isTall: dto.isTall ?? false,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateStudioGalleryItemDto): Promise<StudioGalleryItem> {
    const existing = await this.prisma.studioGalleryItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');

    if (dto.modelId !== undefined && dto.modelId !== existing.modelId) {
      await this.assertModelExists(dto.modelId);
    }

    const data: Prisma.StudioGalleryItemUpdateInput = {};
    if (dto.modelId !== undefined) data.model = { connect: { id: dto.modelId } };
    if (dto.imageKey !== undefined) data.imageKey = dto.imageKey;
    if (dto.caption !== undefined) {
      data.caption = dto.caption as unknown as Prisma.InputJsonValue;
    }
    if (dto.isTall !== undefined) data.isTall = dto.isTall;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.studioGalleryItem.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.studioGalleryItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    await this.prisma.studioGalleryItem.delete({ where: { id } });
  }

  private async assertModelExists(modelId: string): Promise<void> {
    const exists = await this.prisma.studioModel.findUnique({
      where: { id: modelId },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException('errors.not_found');
  }
}
