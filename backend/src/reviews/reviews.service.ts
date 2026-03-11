import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginate, PaginationDto } from '../common/dto/pagination.dto.js';
import { CreateReviewDto } from './dto/create-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    // 1. Check no duplicate review
    const existing = await this.prisma.prisma.review.findFirst({
      where: { productId: dto.productId, userId },
    });
    if (existing)
      throw new ConflictException('You have already reviewed this product');

    // 2. Verify purchase
    const purchased = await this.prisma.prisma.orderItem.findFirst({
      where: {
        productId: dto.productId,
        order: { buyerId: userId, status: 'PAID' },
      },
    });
    if (!purchased) {
      throw new ForbiddenException(
        'You must purchase this product before reviewing',
      );
    }

    // 3. Transaction: create review + update product aggregate
    return this.prisma.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
        select: { id: true, slug: true, rating: true, reviewCount: true },
      });
      if (!product) throw new NotFoundException('Product not found');

      const review = await tx.review.create({
        data: {
          userId,
          productId: dto.productId,
          rating: dto.rating,
          comment: dto.comment,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatar: true } },
            },
          },
        },
      });

      const newCount = product.reviewCount + 1;
      const newRating =
        (Number(product.rating) * product.reviewCount + dto.rating) / newCount;

      await tx.product.update({
        where: { id: dto.productId },
        data: {
          reviewCount: newCount,
          rating: newRating.toFixed(2),
        },
      });

      await this.cache.del(`cache:product:slug:${product.slug}`);
      return review;
    });
  }

  async findByProduct(productId: string, query: PaginationDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const where = { productId };

    const [items, total] = await this.prisma.prisma.$transaction([
      this.prisma.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatar: true } },
            },
          },
        },
      }),
      this.prisma.prisma.review.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async remove(id: string) {
    await this.prisma.prisma.review.delete({ where: { id } });
    return null;
  }
}
