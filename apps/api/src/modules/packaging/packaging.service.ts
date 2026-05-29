import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PackagingConsumption } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecordPackagingDto } from './dto/record-packaging.dto';

const RM_SELECT = {
  rawMaterial: { select: { id: true, name: true, unit: true, unitPrice: true } },
} as const;

@Injectable()
export class PackagingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Packaging consumptions for a delivery + the total cost (Σ qty × unitPrice). */
  async listForDelivery(deliveryId: string): Promise<{
    items: PackagingConsumption[];
    totalCost: string;
  }> {
    await this.assertDeliveryExists(deliveryId);
    const items = await this.prisma.packagingConsumption.findMany({
      where: { deliveryId },
      include: RM_SELECT,
      orderBy: { id: 'asc' },
    });
    const totalCost = items
      .reduce(
        (sum, c) =>
          sum.plus(
            c.quantity.times(
              (c as PackagingConsumption & { rawMaterial: { unitPrice: Prisma.Decimal } })
                .rawMaterial.unitPrice,
            ),
          ),
        new Prisma.Decimal(0),
      )
      .toFixed(2);
    return { items, totalCost };
  }

  async record(deliveryId: string, dto: RecordPackagingDto): Promise<PackagingConsumption> {
    await this.assertDeliveryExists(deliveryId);

    const material = await this.prisma.rawMaterial.findUnique({
      where: { id: dto.rawMaterialId },
    });
    if (!material) throw new BadRequestException('errors.raw_material_not_found');
    if (material.type !== 'PACKAGING') {
      throw new BadRequestException('errors.packaging_material_invalid');
    }

    const quantity = new Prisma.Decimal(dto.quantity);
    if (material.stockQty.lessThan(quantity)) {
      throw new BadRequestException('errors.insufficient_raw_material');
    }

    // Raw-material stock is held directly on RawMaterial.stockQty (not via
    // StockMovementsService, which only governs ProductVariant). Decrement
    // it in the same transaction that books the consumption.
    const [consumption] = await this.prisma.$transaction([
      this.prisma.packagingConsumption.create({
        data: { deliveryId, rawMaterialId: dto.rawMaterialId, quantity },
        include: RM_SELECT,
      }),
      this.prisma.rawMaterial.update({
        where: { id: dto.rawMaterialId },
        data: { stockQty: { decrement: quantity } },
      }),
    ]);
    return consumption;
  }

  async remove(deliveryId: string, id: string): Promise<void> {
    const consumption = await this.prisma.packagingConsumption.findUnique({ where: { id } });
    if (!consumption || consumption.deliveryId !== deliveryId) {
      throw new NotFoundException('errors.not_found');
    }
    // Restore the stock the consumption had decremented.
    await this.prisma.$transaction([
      this.prisma.packagingConsumption.delete({ where: { id } }),
      this.prisma.rawMaterial.update({
        where: { id: consumption.rawMaterialId },
        data: { stockQty: { increment: consumption.quantity } },
      }),
    ]);
  }

  private async assertDeliveryExists(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { id: true },
    });
    if (!delivery) throw new NotFoundException('errors.not_found');
  }
}
