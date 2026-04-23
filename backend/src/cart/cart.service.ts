import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    return this.prisma.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            thumbnailUrl: true,
            status: true,
            seller: {
              select: { id: true, username: true },
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.prisma.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundException('Product not found or not available');
    }

    const alreadyOwned = await this.prisma.prisma.orderItem.findFirst({
      where: {
        productId: dto.productId,
        order: { buyerId: userId, status: 'PAID' },
      },
    });

    if (alreadyOwned) {
      throw new BadRequestException('You already own this product');
    }

    try {
      return await this.prisma.prisma.cartItem.create({
        data: { userId, productId: dto.productId },
        include: {
          product: { select: { id: true, title: true, price: true } },
        },
      });
    } catch (err) {
      // P2002 = unique constraint violation -> already in cart
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Product is already in your cart');
      }
      throw err;
    }
  }

  async removeItem(userId: string, productId: string) {
    await this.prisma.prisma.cartItem.deleteMany({
      where: { userId, productId },
    });
    return null;
  }

  async clearCart(userId: string) {
    await this.prisma.prisma.cartItem.deleteMany({ where: { userId } });
    return null;
  }
}
