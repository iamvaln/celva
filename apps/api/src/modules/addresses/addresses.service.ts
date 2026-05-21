import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { type Address } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAddressDto } from './dto/create-address.dto';
import type { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
  }

  async findByIdForUser(id: string, userId: string): Promise<Address> {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) throw new NotFoundException('errors.not_found');
    if (address.userId !== userId) throw new ForbiddenException('errors.forbidden');
    return address;
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    // First address: auto-promote to default regardless of dto.isDefault.
    const existing = await this.prisma.address.count({ where: { userId } });
    const isDefault = existing === 0 ? true : (dto.isDefault ?? false);

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: {
          userId,
          label: dto.label,
          fullName: dto.fullName,
          phone: dto.phone,
          line1: dto.line1,
          line2: dto.line2,
          city: dto.city,
          zone: dto.zone,
          country: dto.country ?? 'CM',
          isDefault,
        },
      });
    });
  }

  async update(id: string, userId: string, dto: UpdateAddressDto): Promise<Address> {
    await this.findByIdForUser(id, userId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id },
        data: {
          label: dto.label,
          fullName: dto.fullName,
          phone: dto.phone,
          line1: dto.line1,
          line2: dto.line2,
          city: dto.city,
          zone: dto.zone,
          country: dto.country,
          isDefault: dto.isDefault,
        },
      });
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const address = await this.findByIdForUser(id, userId);
    await this.prisma.address.delete({ where: { id } });

    // If we removed the default, promote the next address (by id) to default
    // so the user always has one if any addresses remain.
    if (address.isDefault) {
      const replacement = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { id: 'asc' },
      });
      if (replacement) {
        await this.prisma.address.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    }
  }
}
