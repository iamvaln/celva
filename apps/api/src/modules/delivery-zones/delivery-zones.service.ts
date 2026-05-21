import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type DeliveryZone } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import type { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

export type PublicDeliveryZone = Omit<DeliveryZone, 'actualCost'>;

@Injectable()
export class DeliveryZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<DeliveryZone[]> {
    return this.prisma.deliveryZone.findMany({ orderBy: [{ isActive: 'desc' }, { id: 'asc' }] });
  }

  async listPublic(): Promise<PublicDeliveryZone[]> {
    const zones = await this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    return zones.map((z) => this.stripActualCost(z));
  }

  async findById(id: string, includeActualCost: boolean): Promise<DeliveryZone | PublicDeliveryZone> {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('errors.not_found');
    return includeActualCost ? zone : this.stripActualCost(zone);
  }

  async create(dto: CreateDeliveryZoneDto): Promise<DeliveryZone> {
    try {
      return await this.prisma.deliveryZone.create({
        data: {
          name: dto.name as unknown as Prisma.InputJsonValue,
          fee: dto.fee,
          actualCost: dto.actualCost,
          freeDeliveryThreshold: dto.freeDeliveryThreshold,
          estimatedDays: (dto.estimatedDays ?? Prisma.JsonNull) as
            | Prisma.InputJsonValue
            | typeof Prisma.JsonNull,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('errors.delivery_zone_name_taken');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateDeliveryZoneDto): Promise<DeliveryZone> {
    await this.assertExists(id);
    const data: Prisma.DeliveryZoneUpdateInput = {};
    if (dto.name) data.name = dto.name as unknown as Prisma.InputJsonValue;
    if (dto.fee !== undefined) data.fee = dto.fee;
    if (dto.actualCost !== undefined) data.actualCost = dto.actualCost;
    if (dto.freeDeliveryThreshold !== undefined) {
      data.freeDeliveryThreshold = dto.freeDeliveryThreshold;
    }
    if (dto.estimatedDays !== undefined) {
      data.estimatedDays = dto.estimatedDays as unknown as Prisma.InputJsonValue;
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    try {
      return await this.prisma.deliveryZone.update({ where: { id }, data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('errors.delivery_zone_name_taken');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    await this.assertExists(id);
    try {
      await this.prisma.deliveryZone.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        // Delivery rows reference it (historic).
        throw new ConflictException('errors.delivery_zone_in_use');
      }
      throw err;
    }
  }

  /**
   * Fee calculation per spec §7.3: zero when subtotal meets the zone's
   * freeDeliveryThreshold; otherwise the public fee. Free-delivery is a
   * global toggle (FREE_DELIVERY_ENABLED setting) — callers pass the
   * resolved boolean rather than re-reading it.
   */
  computeFee(
    zone: Pick<DeliveryZone, 'fee' | 'freeDeliveryThreshold'>,
    subtotal: Prisma.Decimal,
    freeDeliveryEnabled: boolean,
  ): Prisma.Decimal {
    if (
      freeDeliveryEnabled &&
      zone.freeDeliveryThreshold &&
      subtotal.greaterThanOrEqualTo(zone.freeDeliveryThreshold)
    ) {
      return new Prisma.Decimal(0);
    }
    return new Prisma.Decimal(zone.fee);
  }

  private stripActualCost(zone: DeliveryZone): PublicDeliveryZone {
    const stripped: Omit<DeliveryZone, 'actualCost'> & Partial<Pick<DeliveryZone, 'actualCost'>> =
      { ...zone };
    delete stripped.actualCost;
    return stripped;
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.deliveryZone.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('errors.not_found');
  }
}
