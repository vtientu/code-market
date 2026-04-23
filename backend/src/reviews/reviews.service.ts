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

    // 3. Transaction: create review + recalc product aggregate from source
    return this.prisma.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
        select: { id: true, slug: true },
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

      // Recompute from source — race-safe vs read-then-write.
      const agg = await tx.review.aggregate({
        where: { productId: dto.productId },
        _avg: { rating: true },
        _count: { _all: true },
      });
      const avg = agg._avg.rating ? Number(agg._avg.rating) : 0;
      await tx.product.update({
        where: { id: dto.productId },
        data: { reviewCount: agg._count._all, rating: avg.toFixed(2) },
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
    const review = await this.prisma.prisma.review.findUnique({
      where: { id },
      select: { productId: true, product: { select: { slug: true } } },
    });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id } });
      const agg = await tx.review.aggregate({
        where: { productId: review.productId },
        _avg: { rating: true },
        _count: { _all: true },
      });
      const avg = agg._avg.rating ? Number(agg._avg.rating) : 0;
      await tx.product.update({
        where: { id: review.productId },
        data: { reviewCount: agg._count._all, rating: avg.toFixed(2) },
      });
    });

    await this.cache.del(`cache:product:slug:${review.product.slug}`);
    return null;
  }
}
