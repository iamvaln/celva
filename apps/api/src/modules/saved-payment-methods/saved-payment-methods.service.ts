import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { type PaymentMethod, type SavedPaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import type { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class SavedPaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<SavedPaymentMethod[]> {
    return this.prisma.savedPaymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findByIdForUser(id: string, userId: string): Promise<SavedPaymentMethod> {
    const method = await this.prisma.savedPaymentMethod.findUnique({ where: { id } });
    if (!method) throw new NotFoundException('errors.not_found');
    if (method.userId !== userId) throw new ForbiddenException('errors.forbidden');
    return method;
  }

  async create(userId: string, dto: CreatePaymentMethodDto): Promise<SavedPaymentMethod> {
    const existing = await this.prisma.savedPaymentMethod.count({ where: { userId } });
    const isDefault = existing === 0 ? true : (dto.isDefault ?? false);

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.savedPaymentMethod.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.savedPaymentMethod.create({
        data: {
          userId,
          method: dto.method as PaymentMethod,
          label: dto.label,
          phoneNumber: dto.phoneNumber,
          isDefault,
        },
      });
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdatePaymentMethodDto,
  ): Promise<SavedPaymentMethod> {
    await this.findByIdForUser(id, userId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.savedPaymentMethod.updateMany({
          where: { userId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.savedPaymentMethod.update({
        where: { id },
        data: {
          label: dto.label,
          phoneNumber: dto.phoneNumber,
          isDefault: dto.isDefault,
        },
      });
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const method = await this.findByIdForUser(id, userId);
    await this.prisma.savedPaymentMethod.delete({ where: { id } });

    if (method.isDefault) {
      const replacement = await this.prisma.savedPaymentMethod.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      if (replacement) {
        await this.prisma.savedPaymentMethod.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    }
  }
}
