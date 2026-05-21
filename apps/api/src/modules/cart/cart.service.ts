import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Cart, type CartItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AddCartItemDto } from './dto/add-cart-item.dto';
import type { UpdateCartItemDto } from './dto/update-cart-item.dto';

type CartItemHydrated = CartItem & {
  variant: {
    id: string;
    sku: string;
    stock: number;
    priceOverride: Prisma.Decimal | null;
    isActive: boolean;
    product: {
      id: string;
      slug: string;
      name: Prisma.JsonValue;
      displayPrice: Prisma.Decimal;
      isActive: boolean;
    };
  };
};

export type CartView = {
  id: string;
  userId: string;
  items: Array<{
    id: string;
    variantId: string;
    quantity: number;
    sku: string;
    productSlug: string;
    productName: Prisma.JsonValue;
    unitPrice: string; // priceOverride ?? product.displayPrice
    lineTotal: string;
    stockAvailable: number;
    isAvailable: boolean; // product + variant active AND stock > 0
  }>;
  itemsCount: number;
  total: string;
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(userId: string): Promise<CartView> {
    const cart = await this.getOrCreate(userId);
    return this.serialize(cart.id);
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartView> {
    const cart = await this.getOrCreate(userId);
    const variant = await this.loadVariantOrThrow(dto.variantId);

    if (!variant.isActive || !variant.product.isActive) {
      throw new BadRequestException('errors.cart_variant_unavailable');
    }

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    });
    const targetQty = (existing?.quantity ?? 0) + dto.quantity;
    if (targetQty > variant.stock) {
      throw new BadRequestException('errors.insufficient_stock');
    }

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: targetQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, variantId: variant.id, quantity: dto.quantity },
      });
    }
    return this.serialize(cart.id);
  }

  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartView> {
    const cart = await this.getOrCreate(userId);
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('errors.not_found');
    if (item.cartId !== cart.id) throw new ForbiddenException('errors.forbidden');

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return this.serialize(cart.id);
    }

    const variant = await this.loadVariantOrThrow(item.variantId);
    if (dto.quantity > variant.stock) {
      throw new BadRequestException('errors.insufficient_stock');
    }
    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });
    return this.serialize(cart.id);
  }

  async removeItem(userId: string, itemId: string): Promise<CartView> {
    const cart = await this.getOrCreate(userId);
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('errors.not_found');
    if (item.cartId !== cart.id) throw new ForbiddenException('errors.forbidden');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.serialize(cart.id);
  }

  async clear(userId: string): Promise<CartView> {
    const cart = await this.getOrCreate(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.serialize(cart.id);
  }

  private async getOrCreate(userId: string): Promise<Cart> {
    const existing = await this.prisma.cart.findUnique({ where: { userId } });
    if (existing) return existing;
    // Auth creates the cart for CLIENT signups (see auth.service.ts). For
    // other roles (admin trying their own cart, edge case), we create it
    // on demand.
    return this.prisma.cart.create({ data: { userId } });
  }

  private async loadVariantOrThrow(variantId: string): Promise<CartItemHydrated['variant']> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            slug: true,
            name: true,
            displayPrice: true,
            isActive: true,
          },
        },
      },
    });
    if (!variant) throw new BadRequestException('errors.variant_not_found');
    return variant as unknown as CartItemHydrated['variant'];
  }

  private async serialize(cartId: string): Promise<CartView> {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: {
        items: {
          orderBy: { id: 'asc' },
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    slug: true,
                    name: true,
                    displayPrice: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const items = cart.items.map((it) => {
      const unitPriceDec = (it.variant.priceOverride ?? it.variant.product.displayPrice) as Prisma.Decimal;
      const lineTotal = unitPriceDec.mul(it.quantity);
      const isAvailable =
        it.variant.isActive && it.variant.product.isActive && it.variant.stock > 0;
      return {
        id: it.id,
        variantId: it.variantId,
        quantity: it.quantity,
        sku: it.variant.sku,
        productSlug: it.variant.product.slug,
        productName: it.variant.product.name,
        unitPrice: unitPriceDec.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
        stockAvailable: it.variant.stock,
        isAvailable,
      };
    });

    const total = items
      .reduce((sum, i) => sum.add(new Prisma.Decimal(i.lineTotal)), new Prisma.Decimal(0))
      .toFixed(2);

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      itemsCount: items.reduce((n, i) => n + i.quantity, 0),
      total,
    };
  }
}
