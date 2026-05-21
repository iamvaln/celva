import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type PromoCode } from '@prisma/client';
import { PROMO_CODE_TYPE, type PromoCodeType } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import type { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import type { ListPromoCodesQuery } from './dto/list-promo-codes.query';

export type PromoEvaluation = {
  code: string;
  type: PromoCodeType;
  value: string;
  minOrderAmount: string | null;
  /** Discount applied to the subtotal (≥ 0, never makes the total negative). */
  discount: string;
  /** Subtotal minus discount, never below 0. */
  subtotalAfter: string;
};

export type PaginatedPromoCodes = {
  data: PromoCode[];
  total: number;
  page: number;
  pageSize: number;
};

@Injectable()
export class PromoCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListPromoCodesQuery): Promise<PaginatedPromoCodes> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where: Prisma.PromoCodeWhereInput = {
      ...(query.search
        ? { code: { contains: query.search.toUpperCase(), mode: 'insensitive' } }
        : {}),
      ...(query.type ? { type: query.type as PromoCodeType } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
    };
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDir ?? 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.promoCode.findMany({
        where,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.promoCode.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findById(id: string): Promise<PromoCode> {
    const code = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!code) throw new NotFoundException('errors.not_found');
    return code;
  }

  async create(dto: CreatePromoCodeDto): Promise<PromoCode> {
    const normalized = dto.code.toUpperCase();
    this.assertValueRange(dto.type as PromoCodeType, dto.value);
    this.assertDateWindow(dto.startsAt, dto.expiresAt);

    try {
      return await this.prisma.promoCode.create({
        data: {
          code: normalized,
          type: dto.type as PromoCodeType,
          value: dto.value,
          minOrderAmount: dto.minOrderAmount,
          maxUses: dto.maxUses,
          maxUsesPerUser: dto.maxUsesPerUser,
          isActive: dto.isActive ?? true,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('errors.promo_code_already_exists');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdatePromoCodeDto): Promise<PromoCode> {
    const current = await this.findById(id);
    const type = (dto.type ?? current.type) as PromoCodeType;
    if (dto.value !== undefined) this.assertValueRange(type, dto.value);
    this.assertDateWindow(
      dto.startsAt ?? current.startsAt?.toISOString(),
      dto.expiresAt ?? current.expiresAt?.toISOString(),
    );

    const data: Prisma.PromoCodeUpdateInput = {};
    if (dto.type !== undefined) data.type = dto.type as PromoCodeType;
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.minOrderAmount !== undefined) data.minOrderAmount = dto.minOrderAmount;
    if (dto.maxUses !== undefined) data.maxUses = dto.maxUses;
    if (dto.maxUsesPerUser !== undefined) data.maxUsesPerUser = dto.maxUsesPerUser;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.expiresAt !== undefined) data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    return this.prisma.promoCode.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    try {
      await this.prisma.promoCode.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        // Orders reference it (historic usage).
        throw new ConflictException('errors.promo_code_in_use');
      }
      throw err;
    }
  }

  /**
   * Stateless validation: given a typed code + the customer's current cart
   * subtotal, returns a PromoEvaluation if everything checks out, or throws
   * a 400 with a specific i18n key explaining why.
   *
   * Does NOT increment usedCount — that happens in Batch R when the order
   * actually lands, per spec §8 ("usedCount décrémenté à l'annulation").
   */
  async evaluate(
    rawCode: string,
    subtotal: Prisma.Decimal,
    userId: string,
  ): Promise<PromoEvaluation> {
    const code = rawCode.toUpperCase();
    const promo = await this.prisma.promoCode.findUnique({ where: { code } });
    if (!promo) throw new BadRequestException('errors.invalid_promo_code');
    if (!promo.isActive) throw new BadRequestException('errors.invalid_promo_code');

    const now = new Date();
    if (promo.startsAt && now < promo.startsAt) {
      throw new BadRequestException('errors.invalid_promo_code');
    }
    if (promo.expiresAt && now >= promo.expiresAt) {
      throw new BadRequestException('errors.invalid_promo_code');
    }

    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('errors.promo_code_exhausted');
    }

    if (promo.maxUsesPerUser !== null) {
      const used = await this.prisma.order.count({
        where: { promoCodeId: promo.id, userId },
      });
      if (used >= promo.maxUsesPerUser) {
        throw new BadRequestException('errors.promo_code_user_limit');
      }
    }

    if (promo.minOrderAmount && subtotal.lessThan(promo.minOrderAmount)) {
      throw new BadRequestException('errors.promo_code_min_order');
    }

    const discount =
      promo.type === PROMO_CODE_TYPE.PERCENTAGE
        ? subtotal.mul(promo.value).div(100)
        : new Prisma.Decimal(promo.value);

    // Never reduce the total below 0.
    const cappedDiscount = discount.greaterThan(subtotal) ? subtotal : discount;
    const subtotalAfter = subtotal.minus(cappedDiscount);

    return {
      code: promo.code,
      type: promo.type as PromoCodeType,
      value: promo.value.toFixed(2),
      minOrderAmount: promo.minOrderAmount ? promo.minOrderAmount.toFixed(2) : null,
      discount: cappedDiscount.toFixed(2),
      subtotalAfter: subtotalAfter.toFixed(2),
    };
  }

  private assertValueRange(type: PromoCodeType, value: number): void {
    if (type === PROMO_CODE_TYPE.PERCENTAGE) {
      if (value <= 0 || value > 100) {
        throw new BadRequestException('errors.promo_code_value_out_of_range');
      }
    } else {
      if (value <= 0) {
        throw new BadRequestException('errors.promo_code_value_out_of_range');
      }
    }
  }

  private assertDateWindow(startsAt: string | null | undefined, expiresAt: string | null | undefined): void {
    if (!startsAt || !expiresAt) return;
    if (new Date(startsAt) >= new Date(expiresAt)) {
      throw new BadRequestException('errors.promo_code_date_window');
    }
  }
}
