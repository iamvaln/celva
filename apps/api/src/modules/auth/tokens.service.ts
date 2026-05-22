import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ms = (input: string): number => {
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) throw new Error(`Invalid duration: ${input}`);
  const value = Number(match[1]);
  const unit = match[2] ?? '';
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (multipliers[unit] ?? 0);
};

@Injectable()
export class TokensService {
  constructor(private readonly prisma: PrismaService) {}

  static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  static randomToken(bytes = 48): string {
    return randomBytes(bytes).toString('base64url');
  }

  static expirationFromString(duration: string): Date {
    return new Date(Date.now() + ms(duration));
  }

  async storeRefreshToken(input: {
    userId: string;
    rawToken: string;
    expiresAt: Date;
    userAgent?: string;
    ipHash?: string;
  }): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash: TokensService.hash(input.rawToken),
        expiresAt: input.expiresAt,
        userAgent: input.userAgent,
        ipHash: input.ipHash,
      },
    });
  }

  async findActiveRefreshToken(rawToken: string): Promise<{ id: string; userId: string } | null> {
    const hash = TokensService.hash(rawToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });
    if (!record || record.revokedAt) return null;
    if (record.expiresAt < new Date()) return null;
    return { id: record.id, userId: record.userId };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const hash = TokensService.hash(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async createPasswordResetToken(userId: string, ttl = '1h'): Promise<string> {
    const raw = TokensService.randomToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: TokensService.hash(raw),
        expiresAt: TokensService.expirationFromString(ttl),
      },
    });
    return raw;
  }

  async consumePasswordResetToken(
    rawToken: string,
  ): Promise<{ userId: string } | null> {
    const hash = TokensService.hash(rawToken);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    if (!record || record.usedAt) return null;
    if (record.expiresAt < new Date()) return null;
    await this.prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return { userId: record.userId };
  }

  async createEmailChangeToken(
    userId: string,
    newEmail: string,
    ttl = '1h',
  ): Promise<string> {
    const raw = TokensService.randomToken();
    await this.prisma.emailChangeToken.create({
      data: {
        userId,
        newEmail,
        tokenHash: TokensService.hash(raw),
        expiresAt: TokensService.expirationFromString(ttl),
      },
    });
    return raw;
  }

  async consumeEmailChangeToken(
    rawToken: string,
  ): Promise<{ userId: string; newEmail: string } | null> {
    const hash = TokensService.hash(rawToken);
    const record = await this.prisma.emailChangeToken.findUnique({
      where: { tokenHash: hash },
      select: { id: true, userId: true, newEmail: true, expiresAt: true, usedAt: true },
    });
    if (!record || record.usedAt) return null;
    if (record.expiresAt < new Date()) return null;
    await this.prisma.emailChangeToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return { userId: record.userId, newEmail: record.newEmail };
  }
}
