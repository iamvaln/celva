import { BadRequestException, Injectable } from '@nestjs/common';
import { type RelatedProduct } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SetRelatedProductsDto } from './dto/set-related-products.dto';

@Injectable()
export class RelatedProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(productId: string): Promise<RelatedProduct[]> {
    await this.assertProductExists(productId);
    return this.prisma.relatedProduct.findMany({
      where: { productId },
      orderBy: [{ sortOrder: 'asc' }, { relatedProductId: 'asc' }],
    });
  }

  /**
   * Spec §4.7: replace the full directional cross-sell list. Max 6 items
   * enforced by the DTO. No self-reference; every related product must
   * exist (and is allowed to be inactive — admin's choice).
   */
  async setRelated(
    productId: string,
    dto: SetRelatedProductsDto,
  ): Promise<RelatedProduct[]> {
    await this.assertProductExists(productId);

    if (dto.items.some((i) => i.relatedProductId === productId)) {
      throw new BadRequestException('errors.related_product_self_reference');
    }

    if (dto.items.length > 0) {
      const ids = dto.items.map((i) => i.relatedProductId);
      const found = await this.prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      });
      if (found.length !== ids.length) {
        throw new BadRequestException('errors.related_product_not_found');
      }
    }

    await this.prisma.$transaction([
      this.prisma.relatedProduct.deleteMany({ where: { productId } }),
      ...(dto.items.length > 0
        ? [
            this.prisma.relatedProduct.createMany({
              data: dto.items.map((item, idx) => ({
                productId,
                relatedProductId: item.relatedProductId,
                sortOrder: item.sortOrder ?? idx,
              })),
            }),
          ]
        : []),
    ]);

    return this.list(productId);
  }

  private async assertProductExists(productId: string): Promise<void> {
    const exists = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException('errors.product_not_found');
  }
}
