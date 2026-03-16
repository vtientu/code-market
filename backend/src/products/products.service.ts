import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginate } from '../common/dto/pagination.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductQueryDto } from './dto/product-query.dto.js';
import { AddProductVersionDto, AddProductImageDto } from './dto/add-file.dto.js';
import { UpdateProductStatusDto } from './dto/update-status.dto.js';

const productCacheKey = (slug: string) => `cache:product:slug:${slug}`;
const PRODUCT_CACHE_TTL = 1800;

const PRODUCT_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  price: true,
  rating: true,
  reviewCount: true,
  totalSales: true,
  thumbnailUrl: true,
  status: true,
  createdAt: true,
  seller: {
    select: {
      id: true,
      username: true,
      profile: { select: { displayName: true, avatar: true } },
    },
  },
  category: { select: { id: true, name: true, slug: true } },
  tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
} as const;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ── Public ──────────────────────────────────────────

  async findPublished(query: ProductQueryDto) {
    const {
      page,
      limit,
      categoryId,
      tagIds,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = query;
    const skip = (page - 1) * limit;

    const where = {
      status: ProductStatus.PUBLISHED,
      ...(categoryId && { categoryId }),
      ...(tagIds?.length && { tags: { some: { tagId: { in: tagIds } } } }),
      ...(minPrice && { price: { gte: minPrice } }),
      ...(maxPrice && {
        price: { lte: maxPrice, ...(minPrice ? { gte: minPrice } : {}) },
      }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      }),
    };

    const [items, total] = await this.prisma.prisma.$transaction([
      this.prisma.prisma.product.findMany({
        where,
        select: PRODUCT_LIST_SELECT,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.prisma.product.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findBySlug(slug: string) {
    const cached = await this.cache.get(productCacheKey(slug));
    if (cached) return cached;

    const product = await this.prisma.prisma.product.findUnique({
      where: { slug, status: ProductStatus.PUBLISHED },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatar: true } },
          },
        },
        category: true,
        tags: { include: { tag: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        versions: { orderBy: { createdAt: 'desc' } },
        _count: { select: { reviews: true } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    await this.cache.set(productCacheKey(slug), product, PRODUCT_CACHE_TTL);
    return product;
  }

  // ── Seller ───────────────────────────────────────────

  async findMySeller(sellerId: string, query: ProductQueryDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.prisma.$transaction([
      this.prisma.prisma.product.findMany({
        where: { sellerId },
        select: PRODUCT_LIST_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.prisma.product.count({ where: { sellerId } }),
    ]);
    return paginate(items, total, page, limit);
  }

  async create(sellerId: string, dto: CreateProductDto) {
    const { tagIds, ...data } = dto;
    return this.prisma.prisma.product.create({
      data: {
        ...data,
        sellerId,
        tags: tagIds?.length
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: { tags: { include: { tag: true } }, category: true },
    });
  }

  async update(sellerId: string, id: string, dto: UpdateProductDto) {
    const product = await this.findOwnedOrFail(sellerId, id);

    if (
      product.status !== ProductStatus.DRAFT &&
      product.status !== ProductStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Only DRAFT or REJECTED products can be edited',
      );
    }

    const { tagIds, ...data } = dto;
    const updated = await this.prisma.prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...(tagIds !== undefined && {
          tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) },
        }),
      },
      include: { tags: { include: { tag: true } }, category: true },
    });

    await this.cache.del(productCacheKey(updated.slug));
    return updated;
  }

  async remove(sellerId: string, id: string) {
    const product = await this.findOwnedOrFail(sellerId, id);
    if (product.status !== ProductStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT products can be deleted');
    }
    await this.prisma.prisma.product.delete({ where: { id } });
    return null;
  }

  async submit(sellerId: string, id: string) {
    const product = await this.findOwnedOrFail(sellerId, id);
    if (
      product.status !== ProductStatus.DRAFT &&
      product.status !== ProductStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Only DRAFT or REJECTED products can be submitted for review',
      );
    }
    return this.prisma.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.PENDING_REVIEW },
    });
  }

  async addVersion(
    sellerId: string,
    productId: string,
    dto: AddProductVersionDto,
  ) {
    await this.findOwnedOrFail(sellerId, productId);
    await this.prisma.prisma.productVersion.updateMany({
      where: { productId, isLatest: true },
      data: { isLatest: false },
    });
    return this.prisma.prisma.productVersion.create({
      data: { productId, ...dto, isLatest: true },
    });
  }

  async removeVersion(sellerId: string, productId: string, versionId: string) {
    await this.findOwnedOrFail(sellerId, productId);
    const target = await this.prisma.prisma.productVersion.findFirst({
      where: { id: versionId, productId },
      select: { id: true, isLatest: true },
    });
    if (!target) return null;

    await this.prisma.prisma.productVersion.delete({ where: { id: versionId } });

    if (target.isLatest) {
      const next = await this.prisma.prisma.productVersion.findFirst({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (next) {
        await this.prisma.prisma.productVersion.update({
          where: { id: next.id },
          data: { isLatest: true },
        });
      }
    }
    return null;
  }

  async addImage(sellerId: string, productId: string, dto: AddProductImageDto) {
    await this.findOwnedOrFail(sellerId, productId);
    return this.prisma.prisma.productImage.create({
      data: { productId, ...dto },
    });
  }

  async removeImage(sellerId: string, productId: string, imageId: string) {
    await this.findOwnedOrFail(sellerId, productId);
    await this.prisma.prisma.productImage.deleteMany({
      where: { id: imageId, productId },
    });
    return null;
  }

  // ── Admin ────────────────────────────────────────────

  async findPending(query: ProductQueryDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.prisma.$transaction([
      this.prisma.prisma.product.findMany({
        where: { status: ProductStatus.PENDING_REVIEW },
        select: PRODUCT_LIST_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.prisma.product.count({
        where: { status: ProductStatus.PENDING_REVIEW },
      }),
    ]);
    return paginate(items, total, page, limit);
  }

  async updateStatus(id: string, dto: UpdateProductStatusDto) {
    const product = await this.prisma.prisma.product.findUnique({
      where: { id },
    });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await this.prisma.prisma.product.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason: dto.rejectionReason ?? null,
      },
    });

    await this.cache.del(productCacheKey(product.slug));
    return updated;
  }

  // ── Helpers ──────────────────────────────────────────

  private async findOwnedOrFail(sellerId: string, id: string) {
    const product = await this.prisma.prisma.product.findUnique({
      where: { id },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId)
      throw new ForbiddenException('Access denied');
    return product;
  }
}
