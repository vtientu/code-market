import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginate, PaginationDto } from '../common/dto/pagination.dto.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(userId: string, query: PaginationDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const where = { userId };

    const [items, total] = await this.prisma.prisma.$transaction([
      this.prisma.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.prisma.notification.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return null;
  }

  async remove(userId: string, id: string) {
    await this.prisma.prisma.notification.deleteMany({ where: { id, userId } });
    return null;
  }

  async createNotification(
    userId: string,
    title: string,
    body: string,
    link?: string,
  ) {
    return this.prisma.prisma.notification.create({
      data: { userId, title, body, link },
    });
  }
}
