import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginate, PaginationDto } from '../common/dto/pagination.dto.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async placeOrder(buyerId: string, dto: CreateOrderDto) {
    return this.prisma.prisma.$transaction(async (tx) => {
      // 1. Fetch and validate products
      const products = await tx.product.findMany({
        where: { id: { in: dto.productIds } },
        select: {
          id: true,
          title: true,
          price: true,
          status: true,
          sellerId: true,
        },
      });

      if (products.length !== dto.productIds.length) {
        throw new NotFoundException('One or more products not found');
      }

      const notPublished = products.find(
        (p) => p.status !== ProductStatus.PUBLISHED,
      );
      if (notPublished) {
        throw new BadRequestException(
          `Product "${notPublished.title}" is not available for purchase`,
        );
      }

      // 2. Check no duplicates already owned
      const owned = await tx.orderItem.findFirst({
        where: {
          productId: { in: dto.productIds },
          order: { buyerId, status: 'PAID' },
        },
        include: { product: { select: { title: true } } },
      });

      if (owned) {
        throw new BadRequestException(
          `You already own "${owned.product.title}"`,
        );
      }

      // 3. Calculate total
      const totalAmount = products.reduce((sum, p) => sum + Number(p.price), 0);

      // 4. Create order + items
      return tx.order.create({
        data: {
          buyerId,
          totalAmount: totalAmount.toString(),
          items: {
            create: products.map((p) => ({
              productId: p.id,
              price: p.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, title: true, price: true } },
            },
          },
        },
      });
    });
  }

  async findMyOrders(buyerId: string, query: PaginationDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const where = { buyerId };

    const [items, total] = await this.prisma.prisma.$transaction([
      this.prisma.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, title: true, thumbnailUrl: true },
              },
            },
          },
          payment: { select: { status: true, method: true } },
        },
      }),
      this.prisma.prisma.order.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOrderById(buyerId: string, id: string) {
    const order = await this.prisma.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnailUrl: true,
                seller: { select: { id: true, username: true } },
              },
            },
          },
        },
        payment: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId)
      throw new ForbiddenException('Access denied');
    return order;
  }

  async findAllAdmin(query: PaginationDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.prisma.$transaction([
      this.prisma.prisma.order.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, username: true, email: true } },
          items: { select: { id: true, price: true } },
          payment: { select: { status: true, method: true } },
        },
      }),
      this.prisma.prisma.order.count(),
    ]);

    return paginate(items, total, page, limit);
  }
}
