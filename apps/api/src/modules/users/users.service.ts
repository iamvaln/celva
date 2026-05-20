import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';
import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS, USER_ROLE, type UserRole } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TokensService } from '../auth/tokens.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { ListUsersQuery } from './dto/list-users.query';

export type SafeUser = Omit<User, 'passwordHash'>;
export type PaginatedUsers = { data: SafeUser[]; total: number; page: number; pageSize: number };

const PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  async list(query: ListUsersQuery): Promise<PaginatedUsers> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role as UserRole } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDir ?? 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: PUBLIC_SELECT,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC_SELECT });
    if (!user) throw new NotFoundException('errors.not_found');
    return user;
  }

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('errors.email_already_used');
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role as UserRole,
        phone: dto.phone,
        isActive: dto.isActive ?? true,
        ...(dto.role === USER_ROLE.CLIENT ? { cart: { create: {} } } : {}),
      },
      select: PUBLIC_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto, actingUserId: string): Promise<SafeUser> {
    if (dto.isActive === false && id === actingUserId) {
      throw new ForbiddenException('errors.cannot_self_deactivate');
    }
    await this.assertExists(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role as UserRole | undefined,
        phone: dto.phone,
        isActive: dto.isActive,
      },
      select: PUBLIC_SELECT,
    });
  }

  async activate(id: string): Promise<SafeUser> {
    await this.assertExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: PUBLIC_SELECT,
    });
  }

  async deactivate(id: string, actingUserId: string): Promise<SafeUser> {
    if (id === actingUserId) throw new ForbiddenException('errors.cannot_self_deactivate');
    await this.assertExists(id);
    await this.tokens.revokeAllRefreshTokens(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: PUBLIC_SELECT,
    });
  }

  /**
   * Soft-delete: marks the account inactive and anonymizes PII. Spec §0 GDPR
   * mandates 30-day soft-delete + anonymization, retained for compliance.
   */
  async softDelete(id: string, actingUserId: string): Promise<void> {
    if (id === actingUserId) throw new ForbiddenException('errors.cannot_self_delete');
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('errors.not_found');
    await this.tokens.revokeAllRefreshTokens(id);
    await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        email: `deleted+${id}@celva.invalid`,
        name: 'Compte supprimé',
        phone: null,
        passwordHash: 'deleted',
      },
    });
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('errors.not_found');
    // The above is intentionally not a unique-check race fix; subsequent
    // updates will surface FK/uniqueness errors as normal HTTP exceptions.
    if (!exists) throw new BadRequestException('errors.unknown');
  }
}
