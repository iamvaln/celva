import { createHash } from 'node:crypto';
import { v4 as uuid } from 'uuid';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '@celva/shared';
import type { Env } from '../../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { TokensService } from './tokens.service';
import type { SignupDto } from './dto/signup.dto';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

export type SessionMeta = {
  userAgent?: string;
  ip?: string;
};

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    phone: string | null;
    isActive: boolean;
    createdAt: Date;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly tokens: TokensService,
    private readonly mail: MailService,
  ) {}

  async signup(dto: SignupDto, meta: SessionMeta = {}): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('errors.email_already_used');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        passwordHash,
        role: 'CLIENT',
        cart: { create: {} },
      },
    });

    void this.mail
      .send({
        to: user.email,
        subject: 'Bienvenue chez Celva / Welcome to Celva',
        tag: 'welcome',
        text:
          `Bonjour ${user.name},\n\nMerci de t'être inscrit·e sur celva.store. ` +
          `Tu peux dès maintenant explorer la boutique.\n\n— L'équipe Celva\n\n` +
          `---\n\nHi ${user.name},\n\nThanks for signing up to celva.store. ` +
          `You can now browse the shop.\n\n— The Celva team`,
      })
      .catch(() => undefined);

    return this.issueTokens(user.id, user.email, user.role, meta);
  }

  async login(dto: LoginDto, meta: SessionMeta = {}): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('errors.invalid_credentials');
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('errors.invalid_credentials');
    }
    if (!user.isActive) {
      throw new ForbiddenException('errors.account_disabled');
    }
    return this.issueTokens(user.id, user.email, user.role, meta);
  }

  async refresh(
    rawRefreshToken: string,
    meta: SessionMeta = {},
  ): Promise<AuthResult> {
    const record = await this.tokens.findActiveRefreshToken(rawRefreshToken);
    if (!record) {
      throw new UnauthorizedException('errors.unauthorized');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('errors.account_disabled');
    }
    // Rotation: revoke the old token, issue new pair.
    await this.tokens.revokeRefreshToken(rawRefreshToken);
    return this.issueTokens(user.id, user.email, user.role, meta);
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) {
      await this.tokens.revokeRefreshToken(rawRefreshToken);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration.
    if (!user || !user.isActive) return;

    const rawToken = await this.tokens.createPasswordResetToken(user.id, '1h');
    const storefrontUrl = this.config.get('STOREFRONT_URL', { infer: true });
    const resetUrl = `${storefrontUrl}/auth/reset-password?token=${rawToken}`;

    void this.mail
      .send({
        to: user.email,
        subject: 'Réinitialisation mot de passe / Password reset — Celva',
        tag: 'password_reset',
        text:
          `Bonjour ${user.name},\n\n` +
          `Une demande de réinitialisation de mot de passe a été faite pour ton compte. ` +
          `Si tu n'as pas demandé cela, ignore ce message.\n\n` +
          `Lien (valable 1 heure) : ${resetUrl}\n\n` +
          `---\n\nHi ${user.name},\n\n` +
          `A password reset was requested for your account. Ignore this email if you didn't ask.\n\n` +
          `Link (valid 1 hour): ${resetUrl}`,
      })
      .catch(() => undefined);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const record = await this.tokens.consumePasswordResetToken(rawToken);
    if (!record) {
      throw new BadRequestException('errors.password_reset_invalid');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    // Spec: invalidate ALL refresh tokens after a password reset.
    await this.tokens.revokeAllRefreshTokens(record.userId);
  }

  async getProfile(userId: string): Promise<AuthResult['user']> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('errors.unauthorized');
    return user;
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
    meta: SessionMeta,
  ): Promise<AuthResult> {
    const payload: JwtPayload = { sub: userId, email, role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRATION', { infer: true }),
      jwtid: uuid(),
    });
    const refreshExpiration = this.config.get('JWT_REFRESH_EXPIRATION', { infer: true });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: refreshExpiration,
      jwtid: uuid(),
    });
    const expiresAt = TokensService.expirationFromString(refreshExpiration);
    await this.tokens.storeRefreshToken({
      userId,
      rawToken: refreshToken,
      expiresAt,
      userAgent: meta.userAgent,
      ipHash: meta.ip
        ? createHash('sha256').update(meta.ip).digest('hex').slice(0, 16)
        : undefined,
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('errors.unauthorized');

    return { accessToken, refreshToken, refreshExpiresAt: expiresAt, user };
  }
}
