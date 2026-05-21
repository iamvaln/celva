import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type PickupPoint } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePickupPointDto } from './dto/create-pickup-point.dto';
import type { UpdatePickupPointDto } from './dto/update-pickup-point.dto';

@Injectable()
export class PickupPointsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<PickupPoint[]> {
    return this.prisma.pickupPoint.findMany({ orderBy: [{ isActive: 'desc' }, { city: 'asc' }] });
  }

  async listPublic(): Promise<PickupPoint[]> {
    return this.prisma.pickupPoint.findMany({
      where: { isActive: true },
      orderBy: { city: 'asc' },
    });
  }

  async findById(id: string): Promise<PickupPoint> {
    const point = await this.prisma.pickupPoint.findUnique({ where: { id } });
    if (!point) throw new NotFoundException('errors.not_found');
    return point;
  }

  async create(dto: CreatePickupPointDto): Promise<PickupPoint> {
    return this.prisma.pickupPoint.create({
      data: {
        name: dto.name as unknown as Prisma.InputJsonValue,
        address: dto.address,
        city: dto.city,
        phone: dto.phone,
        hours: (dto.hours ?? Prisma.JsonNull) as
          | Prisma.InputJsonValue
          | typeof Prisma.JsonNull,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePickupPointDto): Promise<PickupPoint> {
    await this.findById(id);
    const data: Prisma.PickupPointUpdateInput = {};
    if (dto.name) data.name = dto.name as unknown as Prisma.InputJsonValue;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.hours !== undefined) data.hours = dto.hours as unknown as Prisma.InputJsonValue;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.pickupPoint.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    try {
      await this.prisma.pickupPoint.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ConflictException('errors.pickup_point_in_use');
      }
      throw err;
    }
  }
}
