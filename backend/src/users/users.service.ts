import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

export const USER_SAFE_SELECT = {
  id: true,
  email: true,
  username: true,
  role: true,
  isEmailVerified: true,
  isActive: true,
  createdAt: true,
  profile: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SAFE_SELECT,
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    await this.prisma.prisma.profile.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });

    return this.getMe(userId);
  }

  async getPublicProfile(username: string) {
    const user = await this.prisma.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        profile: true,
        products: {
          where: { status: 'PUBLISHED' },
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            rating: true,
            reviewCount: true,
            totalSales: true,
            thumbnailUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
