import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
      select: { id: true, email: true, username: true },
    });

    if (existing) {
      const field = existing.email === dto.email ? 'email' : 'username';
      throw new ConflictException(`This ${field} is already in use`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role = dto.role ?? Role.BUYER;

    const user = await this.prisma.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          passwordHash,
          role,
          profile: { create: {} },
        },
        select: { id: true, email: true, username: true, role: true },
      });

      if (role === Role.SELLER) {
        await tx.wallet.create({ data: { userId: created.id } });
      }

      return created;
    });

    return this.buildAuthResponse(user.id, user.role, user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user.id, user.role, user);
  }

  async logout(userId: string): Promise<void> {
    await this.cache.del(`refresh:${userId}`);
  }

  async refresh(
    userId: string,
    role: Role,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.signAccessToken(userId, role);
    const refreshToken = this.signRefreshToken(userId, role);
    await this.cache.set(`refresh:${userId}`, refreshToken, 7 * 24 * 60 * 60);
    return { accessToken, refreshToken };
  }

  getRefreshToken(userId: string, role: Role): string {
    return this.signRefreshToken(userId, role);
  }

  async getCachedRefreshToken(userId: string): Promise<string | null> {
    const value = await this.cache.get<string>(`refresh:${userId}`);
    return value ?? null;
  }

  private async buildAuthResponse(
    userId: string,
    role: Role,
    user: { id: string; email: string; username: string; role: Role },
  ): Promise<AuthResponseDto> {
    const accessToken = this.signAccessToken(userId, role);
    const refreshToken = this.signRefreshToken(userId, role);
    await this.cache.set(`refresh:${userId}`, refreshToken, 7 * 24 * 60 * 60);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  private signAccessToken(userId: string, role: Role): string {
    return this.jwtService.sign(
      { sub: userId, role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ) as StringValue,
      },
    );
  }

  private signRefreshToken(userId: string, role: Role): string {
    return this.jwtService.sign(
      { sub: userId, role },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ) as StringValue,
      },
    );
  }
}
