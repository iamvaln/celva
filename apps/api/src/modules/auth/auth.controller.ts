import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { JWT, RATE_LIMITS } from '@celva/shared';
import type { Env } from '../../config/env';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { AuthService, type SessionMeta } from './auth.service';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import { ConfirmPasswordDto } from './dto/confirm-password.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('signup')
  @Throttle({ default: { limit: RATE_LIMITS.SIGNUP_PER_HOUR, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Sign up as a new client. Creates user + empty cart + welcome email.' })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  async signup(
    @Body() dto: SignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const result = await this.auth.signup(dto, this.meta(req));
    this.setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: RATE_LIMITS.LOGIN_PER_15_MIN, ttl: 15 * 60_000 } })
  @ApiOperation({ summary: 'Email + password login. Returns access token, sets refresh cookie.' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const result = await this.auth.login(dto, this.meta(req));
    this.setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token (cookie) for a fresh pair. Rotates the refresh token.' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const rawToken =
      (req.signedCookies as Record<string, string> | undefined)?.[JWT.REFRESH_COOKIE_NAME] ??
      req.header('authorization')?.replace(/^Bearer\s+/i, '') ??
      '';
    const result = await this.auth.refresh(rawToken, this.meta(req));
    this.setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke current refresh token + clear cookie.' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const rawToken = (req.signedCookies as Record<string, string> | undefined)?.[
      JWT.REFRESH_COOKIE_NAME
    ];
    await this.auth.logout(rawToken);
    res.clearCookie(JWT.REFRESH_COOKIE_NAME, this.cookieOpts(0));
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  @ApiOperation({ summary: 'Send a password-reset email. Always 204 (no enumeration).' })
  async forgot(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Consume a reset token + set new password. Revokes all sessions.' })
  async reset(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Current authenticated user.' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.auth.getProfile(user.id);
  }

  @Patch('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update my profile (name + phone). Email change is not supported here.',
  })
  @AuditLog({ action: 'PROFILE_UPDATE', entity: 'User', entityIdFrom: 'user.id' })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<unknown> {
    return this.auth.updateProfile(user.id, dto);
  }

  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Change my password. Requires current password. All other sessions are revoked on success.',
  })
  @AuditLog({ action: 'PASSWORD_CHANGE', entity: 'User', entityIdFrom: 'user.id' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('me/email-change-request')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Step 1 of email change: send a verification email to the new address. The change only takes effect once the link is followed (step 2). User keeps logging in with the old email until then.',
  })
  @AuditLog({
    action: 'EMAIL_CHANGE_REQUEST',
    entity: 'User',
    entityIdFrom: 'user.id',
  })
  async requestEmailChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestEmailChangeDto,
  ): Promise<void> {
    await this.auth.requestEmailChange(user.id, dto.currentPassword, dto.newEmail);
  }

  @Public()
  @Post('email-change-confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Step 2 of email change: consume the token from the verification email. Swaps user.email and revokes all refresh tokens.',
  })
  async confirmEmailChange(@Body() dto: ConfirmEmailChangeDto): Promise<{ email: string }> {
    return this.auth.confirmEmailChange(dto.token);
  }

  @Post('me/sign-out-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Revoke every refresh token on my account, including the current one. The user has to log in fresh everywhere — used as a "kick someone out" defense after a stolen device etc. Requires current password.',
  })
  @AuditLog({
    action: 'SIGN_OUT_ALL_DEVICES',
    entity: 'User',
    entityIdFrom: 'user.id',
  })
  async signOutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.signOutAllDevices(user.id, dto.currentPassword);
    res.clearCookie(JWT.REFRESH_COOKIE_NAME, this.cookieOpts(0));
  }

  @Post('me/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Delete (anonymize) my account. Scrubs PII (email, name, phone, password hash), sets isActive=false, revokes all sessions. Order history is preserved per accounting requirements. Blocked if any order is still in flight (PENDING → SHIPPED). Requires current password.',
  })
  @AuditLog({
    action: 'ACCOUNT_DELETE_REQUEST',
    entity: 'User',
    entityIdFrom: 'user.id',
  })
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.deleteMyAccount(user.id, dto.currentPassword);
    res.clearCookie(JWT.REFRESH_COOKIE_NAME, this.cookieOpts(0));
  }

  // ─── helpers ───

  private meta(req: Request): SessionMeta {
    return {
      userAgent: req.header('user-agent') ?? undefined,
      ip: req.ip,
      locale: req.header('accept-language') ?? undefined,
    };
  }

  private cookieOpts(maxAgeMs: number): CookieOptions {
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      signed: true,
      path: '/',
      maxAge: maxAgeMs,
    };
  }

  private setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
    const maxAge = Math.max(0, expiresAt.getTime() - Date.now());
    res.cookie(JWT.REFRESH_COOKIE_NAME, token, this.cookieOpts(maxAge));
  }
}
