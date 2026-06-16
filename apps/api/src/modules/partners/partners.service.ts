import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Partner } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePartnerDto } from './dto/create-partner.dto';
import type { UpdatePartnerDto } from './dto/update-partner.dto';

/**
 * Capital account per partner, derived from the Transaction ledger:
 *   contributed = Σ CAPITAL_CONTRIBUTION (income)
 *   withdrawn   = Σ CAPITAL_WITHDRAWAL (expense)
 *   netCapital  = contributed − withdrawn
 */
export type PartnerCapital = Partner & {
  contributed: string;
  withdrawn: string;
  netCapital: string;
};

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Partner[]> {
    return this.prisma.partner.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /** Partners enriched with their capital account (apports / retraits / net). */
  async findAllWithCapital(): Promise<PartnerCapital[]> {
    const [partners, grouped] = await Promise.all([
      this.prisma.partner.findMany({ orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }] }),
      this.prisma.transaction.groupBy({
        by: ['partnerId', 'category'],
        where: {
          partnerId: { not: null },
          category: { in: ['CAPITAL_CONTRIBUTION', 'CAPITAL_WITHDRAWAL'] },
        },
        _sum: { amount: true },
      }),
    ]);

    return partners.map((p) => {
      const contributed =
        grouped.find((g) => g.partnerId === p.id && g.category === 'CAPITAL_CONTRIBUTION')?._sum
          .amount ?? new Prisma.Decimal(0);
      const withdrawn =
        grouped.find((g) => g.partnerId === p.id && g.category === 'CAPITAL_WITHDRAWAL')?._sum
          .amount ?? new Prisma.Decimal(0);
      return {
        ...p,
        contributed: contributed.toFixed(2),
        withdrawn: withdrawn.toFixed(2),
        netCapital: contributed.minus(withdrawn).toFixed(2),
      };
    });
  }

  async findById(id: string): Promise<Partner> {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner) throw new NotFoundException('errors.not_found');
    return partner;
  }

  create(dto: CreatePartnerDto): Promise<Partner> {
    return this.prisma.partner.create({
      data: {
        name: dto.name,
        email: dto.email ?? null,
        equityShare: dto.equityShare ?? null,
        notes: dto.notes ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePartnerDto): Promise<Partner> {
    await this.assertExists(id);
    const data: Prisma.PartnerUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.equityShare !== undefined) data.equityShare = dto.equityShare;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.partner.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.assertExists(id);
    try {
      await this.prisma.partner.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        // Capital transactions reference it — deactivate instead.
        throw new ConflictException('errors.partner_in_use');
      }
      throw err;
    }
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.partner.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('errors.not_found');
  }
}
