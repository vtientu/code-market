import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

const CACHE_KEY = 'cache:categories:tree';
const CACHE_TTL = 3600;

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getCategoryTree() {
    const cached = await this.cache.get(CACHE_KEY);
    if (cached) return cached;

    const tree = await this.prisma.prisma.category.findMany({
      where: { parentId: null },
      include: { children: { include: { children: true } } },
      orderBy: { name: 'asc' },
    });

    await this.cache.set(CACHE_KEY, tree, CACHE_TTL);
    return tree;
  }

  async getBySlug(slug: string) {
    const category = await this.prisma.prisma.category.findUnique({
      where: { slug },
      include: { children: true, parent: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const category = await this.prisma.prisma.category.create({ data: dto });
    await this.cache.del(CACHE_KEY);
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findByIdOrFail(id);
    const category = await this.prisma.prisma.category.update({
      where: { id },
      data: dto,
    });
    await this.cache.del(CACHE_KEY);
    return category;
  }

  async remove(id: string) {
    await this.findByIdOrFail(id);
    const hasProducts = await this.prisma.prisma.product.count({
      where: { categoryId: id },
    });
    if (hasProducts > 0) {
      throw new BadRequestException(
        'Cannot delete a category that has products',
      );
    }
    await this.prisma.prisma.category.delete({ where: { id } });
    await this.cache.del(CACHE_KEY);
    return null;
  }

  private async findByIdOrFail(id: string) {
    const category = await this.prisma.prisma.category.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
