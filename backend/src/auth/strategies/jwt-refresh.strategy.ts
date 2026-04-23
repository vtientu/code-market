import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import * as crypto from 'crypto';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@prisma/client';
import { AuthService } from '../auth.service.js';

interface JwtPayload {
  sub: string;
  role: Role;
}

const refreshTokenFromCookie = (req: Request): string | null =>
  (req.cookies as Record<string, string> | undefined)?.['refresh_token'] ??
  null;

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([refreshTokenFromCookie]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<Express.User> {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException();
    }

    const presented = refreshTokenFromCookie(req);
    if (!presented) throw new UnauthorizedException();

    const cached = await this.authService.getCachedRefreshToken(payload.sub);
    if (!cached) throw new UnauthorizedException();

    const a = Buffer.from(presented);
    const b = Buffer.from(cached);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException();
    }

    return { id: payload.sub, role: payload.role };
  }
}
