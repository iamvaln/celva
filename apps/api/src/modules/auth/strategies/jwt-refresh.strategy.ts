import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { JWT } from '@celva/shared';
import type { Env } from '../../../config/env';
import type { JwtPayload } from './jwt.strategy';

export type RefreshContext = JwtPayload & { rawToken: string };

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService<Env, true>) {
    super({
      jwtFromRequest: (req: Request) => {
        const fromCookie = (req.signedCookies as Record<string, string> | undefined)?.[
          JWT.REFRESH_COOKIE_NAME
        ];
        const fromHeader = req.header('authorization')?.replace(/^Bearer\s+/i, '');
        return fromCookie ?? fromHeader ?? null;
      },
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_REFRESH_SECRET', { infer: true }),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<RefreshContext> {
    const rawToken =
      (req.signedCookies as Record<string, string> | undefined)?.[JWT.REFRESH_COOKIE_NAME] ??
      req.header('authorization')?.replace(/^Bearer\s+/i, '');
    if (!rawToken) {
      throw new UnauthorizedException('errors.unauthorized');
    }
    return { ...payload, rawToken };
  }
}
