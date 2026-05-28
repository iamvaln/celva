import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type RawMaterial, type RawMaterialType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { ListRawMaterialsQuery } from './dto/list-raw-materials.query';

type RawMaterialWithFlag = RawMaterial & { isLowStock: boolean };

const INCLUDE = {
  supplier: { select: { id: true, name: true } },
} as const;

@Injectable()
export class RawMaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  private withFlag<T extends RawMaterial>(m: T): T & { isLowStock: boolean } {
    const isLowStock =
      m.alertThreshold !== null && m.stockQty.lessThanOrEqualTo(m.alertThreshold);
    return { ...m, isLowStock };
  }

  async list(query: ListRawMaterialsQuery): Promise<{
    data: RawMaterialWithFlag[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    // Prisma can't compare two columns in `where`, so resolve the
    // low-stock id set up front with a raw query when that filter is on.
    let lowStockIds: string[] | undefined;
    if (query.lowStock === 'true') {
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM raw_materials
        WHERE "alertThreshold" IS NOT NULL AND "stockQty" <= "alertThreshold"
      `;
      lowStockIds = rows.map((r) => r.id);
      if (lowStockIds.length === 0) {
        return { data: [], total: 0, page, pageSize };
      }
    }

    const where: Prisma.RawMaterialWhereInput = {
      ...(query.type ? { type: query.type as RawMaterialType } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(lowStockIds ? { id: { in: lowStockIds } } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const sortBy = query.sortBy ?? 'name';
    const sortDir = query.sortDir ?? 'asc';
    const [data, total] = await this.prisma.$transaction([
      this.prisma.rawMaterial.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rawMaterial.count({ where }),
    ]);
    return { data: data.map((m) => this.withFlag(m)), total, page, pageSize };
  }

  async findById(id: string): Promise<RawMaterialWithFlag> {
    const m = await this.prisma.rawMaterial.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!m) throw new NotFoundException('errors.not_found');
    return this.withFlag(m);
  }

  async create(dto: CreateRawMaterialDto): Promise<RawMaterialWithFlag> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
      select: { id: true },
    });
    if (!supplier) throw new BadRequestException('errors.supplier_not_found');
    const created = await this.prisma.rawMaterial.create({
      data: {
        name: dto.name.trim(),
        type: dto.type as RawMaterialType,
        unit: dto.unit.trim(),
        unitPrice: new Prisma.Decimal(dto.unitPrice),
        stockQty: new Prisma.Decimal(dto.stockQty ?? 0),
        alertThreshold:
          dto.alertThreshold !== undefined
            ? new Prisma.Decimal(dto.alertThreshold)
            : null,
        imageKey: dto.imageKey ?? null,
        supplierId: dto.supplierId,
      },
      include: INCLUDE,
    });
    return this.withFlag(created);
  }

  async update(id: string, dto: UpdateRawMaterialDto): Promise<RawMaterialWithFlag> {
    await this.findById(id);
    if (dto.supplierId !== undefined) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: dto.supplierId },
        select: { id: true },
      });
      if (!supplier) throw new BadRequestException('errors.supplier_not_found');
    }
    const data: Prisma.RawMaterialUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.type !== undefined) data.type = dto.type as RawMaterialType;
    if (dto.unit !== undefined) data.unit = dto.unit.trim();
    if (dto.unitPrice !== undefined) data.unitPrice = new Prisma.Decimal(dto.unitPrice);
    if (dto.stockQty !== undefined) data.stockQty = new Prisma.Decimal(dto.stockQty);
    if (dto.alertThreshold !== undefined) {
      data.alertThreshold = new Prisma.Decimal(dto.alertThreshold);
    }
    if (dto.imageKey !== undefined) {
      data.imageKey = dto.imageKey.trim() || null;
    }
    if (dto.supplierId !== undefined) {
      data.supplier = { connect: { id: dto.supplierId } };
    }
    const updated = await this.prisma.rawMaterial.update({
      where: { id },
      data,
      include: INCLUDE,
    });
    return this.withFlag(updated);
  }

  /**
   * Refuses deletion if the material has purchase-order or consumption
   * history (cost / production audit trail).
   */
  async remove(id: string): Promise<void> {
    await this.findById(id);
    const [poItems, consumptions, packaging] = await Promise.all([
      this.prisma.purchaseOrderItem.count({ where: { rawMaterialId: id } }),
      this.prisma.materialConsumption.count({ where: { rawMaterialId: id } }),
      this.prisma.packagingConsumption.count({ where: { rawMaterialId: id } }),
    ]);
    if (poItems > 0 || consumptions > 0 || packaging > 0) {
      throw new ConflictException('errors.raw_material_in_use');
    }
    await this.prisma.rawMaterial.delete({ where: { id } });
  }
}
