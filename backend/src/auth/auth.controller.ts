import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';

const isProd = process.env['NODE_ENV'] === 'production';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  // 'none' enables true cross-site BFF in prod (requires secure: true).
  // 'lax' is fine for dev where API and clients share localhost.
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    const refreshToken = this.authService.getRefreshToken(result.user.id, result.user.role);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    const refreshToken = this.authService.getRefreshToken(result.user.id, result.user.role);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({ summary: 'Logout and clear refresh token' })
  async logout(@CurrentUser() user: Express.User, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.id);
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
    return null;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({ summary: 'Rotate refresh token and get new access token' })
  async refresh(
    @CurrentUser() user: Express.User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refresh(user.id, user.role);
    res.cookie('refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken: result.accessToken };
  }
}
