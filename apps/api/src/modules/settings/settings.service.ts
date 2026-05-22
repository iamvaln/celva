import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Setting } from '@prisma/client';
import { SETTING_KEYS } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSettingDto } from './dto/create-setting.dto';
import type { UpsertSettingDto } from './dto/upsert-setting.dto';

/** Keys that are safe to expose unauthenticated to the storefront. */
export const PUBLIC_SETTING_KEYS: readonly string[] = [
  SETTING_KEYS.TAX_RATE,
  SETTING_KEYS.CONTACT_EMAIL,
  SETTING_KEYS.CONTACT_PHONE,
  SETTING_KEYS.CONTACT_WHATSAPP,
  SETTING_KEYS.FREE_DELIVERY_ENABLED,
  SETTING_KEYS.R2_BUCKET_URL,
  SETTING_KEYS.INVOICE_COMPANY_NAME,
];

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<Setting[]> {
    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }

  async listPublic(): Promise<Setting[]> {
    return this.prisma.setting.findMany({
      where: { key: { in: [...PUBLIC_SETTING_KEYS] } },
      orderBy: { key: 'asc' },
    });
  }

  async get(key: string): Promise<Setting> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException('errors.not_found');
    return setting;
  }

  async create(dto: CreateSettingDto): Promise<Setting> {
    const existing = await this.prisma.setting.findUnique({ where: { key: dto.key } });
    if (existing) throw new ConflictException('errors.setting_already_exists');
    return this.prisma.setting.create({
      data: {
        key: dto.key,
        value: dto.value,
        label: (dto.label ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull,
      },
    });
  }

  async update(key: string, dto: UpsertSettingDto): Promise<Setting> {
    await this.get(key);
    return this.prisma.setting.update({
      where: { key },
      data: {
        value: dto.value,
        ...(dto.label !== undefined
          ? { label: dto.label as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async remove(key: string): Promise<void> {
    await this.prisma.setting.delete({ where: { key } });
  }
}
