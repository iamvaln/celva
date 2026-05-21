import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type WishlistItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<WishlistItem[]> {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(userId: string, variantId: string): Promise<WishlistItem> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true },
    });
    if (!variant) throw new BadRequestException('errors.variant_not_found');

    try {
      return await this.prisma.wishlistItem.create({
        data: { userId, variantId },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // @@unique([userId, variantId]) — already wishlisted, idempotent
        throw new ConflictException('errors.wishlist_already_added');
      }
      throw err;
    }
  }

  async remove(userId: string, variantId: string): Promise<void> {
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_variantId: { userId, variantId } },
    });
    if (!existing) throw new NotFoundException('errors.not_found');
    await this.prisma.wishlistItem.delete({ where: { id: existing.id } });
  }
}
