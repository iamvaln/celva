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
import { APP_SOURCE, BCRYPT_ROUNDS } from '@celva/shared';
import type { Env } from '../../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TokensService } from './tokens.service';
import type { SignupDto } from './dto/signup.dto';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

export type SessionMeta = {
  userAgent?: string;
  ip?: string;
  /** Locale from Accept-Language. Persisted on the User row at signup. */
  locale?: string;
};

const SUPPORTED_LOCALES = ['fr', 'en'] as const;
type Supported = (typeof SUPPORTED_LOCALES)[number];

/**
 * Normalize an Accept-Language-ish string ('en-US,en;q=0.9,fr;q=0.8') to
 * one of our supported locales. Defaults to 'fr'.
 */
export const normalizeLocale = (raw: string | undefined): Supported => {
  if (!raw) return 'fr';
  const first = raw.split(',')[0]?.split('-')[0]?.toLowerCase() ?? '';
  return (SUPPORTED_LOCALES as readonly string[]).includes(first)
    ? (first as Supported)
    : 'fr';
};

/**
 * Localized storefront paths that appear inside transactional emails. Kept
 * in sync with apps/storefront/src/i18n/routing.ts — drift here would
 * break the email links.
 */
const resetPasswordPath = (locale: string): string =>
  normalizeLocale(locale) === 'en'
    ? '/en/reset-password'
    : '/fr/reinitialiser-mot-de-passe';

const confirmEmailChangePath = (locale: string): string =>
  normalizeLocale(locale) === 'en'
    ? '/en/confirm-email-change'
    : '/fr/confirmer-changement-email';

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
    locale: string;
    mustChangePassword: boolean;
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
    private readonly auditLogs: AuditLogsService,
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
        locale: normalizeLocale(meta.locale),
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

  /**
   * Guest checkout. Find an existing account by email, or create a
   * passwordless one so a shopper can buy without signing up. "Passwordless"
   * = a random, unguessable bcrypt hash that no `login` attempt can ever
   * match; to claim the account later the user goes through password reset
   * (which sets a real hash). Returns just enough for the order to attach.
   * Never overwrites an existing account's data — its name/phone stay as-is.
   */
  async findOrCreatePasswordlessUser(input: {
    email: string;
    name: string;
    phone?: string;
    locale?: string;
  }): Promise<{ id: string; email: string; name: string; isNew: boolean }> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      if (!existing.isActive) {
        throw new ForbiddenException('errors.account_disabled');
      }
      return { id: existing.id, email: existing.email, name: existing.name, isNew: false };
    }
    // Random secret → unguessable; passwordless until the user resets it.
    const passwordHash = await bcrypt.hash(`${uuid()}.${uuid()}`, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        phone: input.phone,
        passwordHash,
        role: 'CLIENT',
        locale: normalizeLocale(input.locale),
        cart: { create: {} },
      },
    });
    return { id: user.id, email: user.email, name: user.name, isNew: true };
  }

  /**
   * Sign a short-lived access token for an existing user id — used by guest
   * checkout to log the shopper into their passwordless account so they can
   * see the order confirmation and track their orders. No refresh token is
   * issued: a guest re-authenticates by claiming the account via password
   * reset. Mirrors the access-token half of {@link issueTokens}.
   */
  async issueGuestAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('errors.account_disabled');
    }
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRATION', { infer: true }),
      jwtid: uuid(),
    });
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
    const resetUrl = `${storefrontUrl}${resetPasswordPath(user.locale)}?token=${rawToken}`;

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
        locale: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('errors.unauthorized');
    return user;
  }

  /**
   * Self-service profile update. Only name + phone are touchable here.
   * Email change is intentionally NOT supported (needs a verify-by-email
   * round-trip we don't have yet). Role + isActive stay admin-only.
   * Pass phone='' to unset it.
   */
  async updateProfile(
    userId: string,
    dto: { name?: string; phone?: string; locale?: string },
  ): Promise<AuthResult['user']> {
    const data: { name?: string; phone?: string | null; locale?: string } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) {
      const trimmed = dto.phone.trim();
      data.phone = trimmed.length === 0 ? null : trimmed;
    }
    if (dto.locale !== undefined) data.locale = normalizeLocale(dto.locale);
    await this.prisma.user.update({ where: { id: userId }, data });
    return this.getProfile(userId);
  }

  /**
   * Customer-initiated password change. Requires the current password —
   * mirrors the password-reset flow's "all sessions revoked" guarantee
   * so that if an attacker briefly had access they're locked out once
   * the legitimate owner rotates.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('errors.unauthorized');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('errors.current_password_invalid');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    // Clear mustChangePassword: the user has now set their own password.
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    await this.tokens.revokeAllRefreshTokens(userId);
  }

  /**
   * Revoke every refresh token for this user. Subsequent access tokens
   * will still work until they expire (15 min), but the user can't
   * silently roll forward — they have to log in fresh on every device,
   * including this one.
   */
  async signOutAllDevices(userId: string, currentPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('errors.unauthorized');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('errors.current_password_invalid');
    await this.tokens.revokeAllRefreshTokens(userId);
  }

  /**
   * Customer self-delete. Anonymize rather than hard-delete: order
   * history, audit log, invoices, etc. all keep referring to this user
   * row (accounting + audit obligations). We scrub PII, set isActive
   * false so login is blocked, and revoke every active session.
   *
   * Blocked if the customer has in-flight orders (PENDING → SHIPPED).
   * They must let those land or cancel them first — otherwise the
   * delivery / refund flow can't reach them.
   */
  async deleteMyAccount(
    userId: string,
    currentPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('errors.unauthorized');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('errors.current_password_invalid');

    const openOrders = await this.prisma.order.count({
      where: {
        userId,
        status: {
          in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED'],
        },
      },
    });
    if (openOrders > 0) {
      throw new BadRequestException('errors.account_has_open_orders');
    }

    // Bcrypt sentinel that no real password can match — `compare` against
    // a non-hash returns false. Belt-and-suspenders alongside isActive=false.
    const wipedHash = 'deleted';
    const scrubbedEmail = `deleted-${user.id}@celva.deleted`;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: scrubbedEmail,
        name: 'Compte supprimé',
        phone: null,
        passwordHash: wipedHash,
        isActive: false,
      },
    });
    await this.tokens.revokeAllRefreshTokens(userId);

    // Cart contents are personal too — scrub. (Wishlist, addresses,
    // saved payment methods would also benefit but they cascade off
    // the user row at the relational level; the user is now flagged
    // inactive so nothing reads them.)
    await this.prisma.cartItem.deleteMany({ where: { cart: { userId } } });

    await this.auditLogs.record({
      userId,
      action: 'ACCOUNT_DELETE',
      entity: 'User',
      entityId: userId,
      appSource: APP_SOURCE.API,
      metadata: { previousEmail: user.email },
    });
  }

  /**
   * Step 1 of email change: customer confirms current password + chooses
   * a new email. We DON'T touch user.email here — just send a verification
   * link to the new address. The user keeps logging in with the old email
   * until they click that link.
   *
   * Failure modes (intentionally non-leaky):
   *   - wrong current password → errors.current_password_invalid
   *   - new email already on another account → errors.email_already_used
   *   - new email matches current email → errors.email_unchanged (cheap UX guard)
   */
  async requestEmailChange(
    userId: string,
    currentPassword: string,
    newEmail: string,
  ): Promise<void> {
    const normalized = newEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('errors.unauthorized');

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('errors.current_password_invalid');

    if (normalized === user.email.toLowerCase()) {
      throw new BadRequestException('errors.email_unchanged');
    }

    const conflict = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true },
    });
    if (conflict) throw new BadRequestException('errors.email_already_used');

    const rawToken = await this.tokens.createEmailChangeToken(user.id, normalized, '1h');
    const storefrontUrl = this.config.get('STOREFRONT_URL', { infer: true });
    const confirmUrl = `${storefrontUrl}${confirmEmailChangePath(user.locale)}?token=${rawToken}`;

    void this.mail
      .send({
        to: normalized,
        subject:
          'Confirmer le changement d\'email / Confirm email change — Celva',
        tag: 'email_change_confirm',
        text:
          `Bonjour ${user.name},\n\n` +
          `Une demande de changement d'email a été faite pour votre compte Celva — ` +
          `de ${user.email} vers ${normalized}.\n\n` +
          `Si c'est bien vous, confirmez en cliquant sur ce lien (valable 1 heure) :\n` +
          `${confirmUrl}\n\n` +
          `Si vous n'avez pas fait cette demande, ignorez ce message — rien n'a changé.\n\n` +
          `---\n\n` +
          `Hi ${user.name},\n\n` +
          `An email change was requested for your Celva account — ` +
          `from ${user.email} to ${normalized}.\n\n` +
          `If that was you, confirm here (link valid 1 hour):\n${confirmUrl}\n\n` +
          `If it wasn't you, ignore this message — nothing has changed.`,
      })
      .catch(() => undefined);
  }

  /**
   * Step 2: customer follows the email link. We re-check the email isn't
   * taken (someone could have signed up with it in the meantime), then
   * swap user.email and revoke ALL refresh tokens — the old browser
   * session(s) get kicked out, just like a password change.
   */
  async confirmEmailChange(rawToken: string): Promise<{ email: string }> {
    const record = await this.tokens.consumeEmailChangeToken(rawToken);
    if (!record) throw new BadRequestException('errors.email_change_invalid');

    const conflict = await this.prisma.user.findUnique({
      where: { email: record.newEmail },
      select: { id: true },
    });
    if (conflict && conflict.id !== record.userId) {
      throw new BadRequestException('errors.email_already_used');
    }

    const previous = await this.prisma.user.findUniqueOrThrow({
      where: { id: record.userId },
      select: { email: true },
    });
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { email: record.newEmail },
    });
    await this.tokens.revokeAllRefreshTokens(record.userId);

    // The interceptor can't help here — this endpoint is @Public(), so
    // request.user is empty. Write the audit row explicitly. The userId
    // comes from the consumed token row.
    await this.auditLogs.record({
      userId: record.userId,
      action: 'EMAIL_CHANGE_CONFIRM',
      entity: 'User',
      entityId: record.userId,
      appSource: APP_SOURCE.API,
      metadata: { from: previous.email, to: record.newEmail },
    });

    return { email: record.newEmail };
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
        locale: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('errors.unauthorized');

    return { accessToken, refreshToken, refreshExpiresAt: expiresAt, user };
  }
}
