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
    // Dedup ids — prevents pricing the same product twice.
    const productIds = [...new Set(dto.productIds)];
    if (productIds.length === 0) {
      throw new BadRequestException('No products selected');
    }

    return this.prisma.prisma.$transaction(async (tx) => {
      // 1. Lock product rows (SELECT ... FOR UPDATE) so price/status snapshot is stable.
      await tx.$queryRawUnsafe(
        `SELECT id FROM Product WHERE id IN (${productIds.map(() => '?').join(',')}) FOR UPDATE`,
        ...productIds,
      );

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          title: true,
          price: true,
          status: true,
          sellerId: true,
        },
      });

      if (products.length !== productIds.length) {
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

      // 2. Reject self-purchase
      const ownProduct = products.find((p) => p.sellerId === buyerId);
      if (ownProduct) {
        throw new BadRequestException(
          `You cannot purchase your own product "${ownProduct.title}"`,
        );
      }

      // 3. Check no duplicates already owned
      const owned = await tx.orderItem.findFirst({
        where: {
          productId: { in: productIds },
          order: { buyerId, status: 'PAID' },
        },
        include: { product: { select: { title: true } } },
      });

      if (owned) {
        throw new BadRequestException(
          `You already own "${owned.product.title}"`,
        );
      }

      // 4. Calculate total from locked snapshot
      const totalAmount = products.reduce((sum, p) => sum + Number(p.price), 0);

      // 5. Create order + items (price snapshotted on each item)
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
