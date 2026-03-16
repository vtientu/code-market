import {
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginate, PaginationDto } from '../common/dto/pagination.dto.js';

@Injectable()
export class LicensesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyLicenses(userId: string, query: PaginationDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const where = { userId };
    const [items, total] = await this.prisma.prisma.$transaction([
      this.prisma.prisma.license.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnailUrl: true,
              seller: {
                select: {
                  id: true,
                  username: true,
                  profile: { select: { displayName: true, avatar: true } },
                },
              },
            },
          },
          latestVersion: {
            select: { id: true, versionNumber: true, fileName: true },
          },
        },
      }),
      this.prisma.prisma.license.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async getLicenseByProduct(userId: string, productId: string) {
    const license = await this.prisma.prisma.license.findUnique({
      where: { userId_productId: { userId, productId } },
      include: {
        product: {
          select: { id: true, title: true, slug: true, thumbnailUrl: true },
        },
        latestVersion: {
          select: { id: true, versionNumber: true, fileName: true },
        },
      },
    });

    if (!license) throw new NotFoundException('License not found');
    return license;
  }

  async download(userId: string, licenseKey: string) {
    const license = await this.prisma.prisma.license.findUnique({
      where: { licenseKey },
      include: {
        latestVersion: {
          select: { id: true, versionNumber: true, fileName: true, fileUrl: true },
        },
      },
    });

    if (!license) throw new NotFoundException('License not found');
    if (license.userId !== userId) throw new ForbiddenException('Access denied');

    if (license.expiresAt && license.expiresAt < new Date()) {
      throw new GoneException('License has expired');
    }

    if (!license.latestVersion) {
      throw new NotFoundException('No file available for this license');
    }

    await this.prisma.prisma.license.update({
      where: { licenseKey },
      data: { downloadCount: { increment: 1 } },
    });

    return {
      fileUrl: license.latestVersion.fileUrl,
      fileName: license.latestVersion.fileName,
      versionNumber: license.latestVersion.versionNumber,
    };
  }
}
