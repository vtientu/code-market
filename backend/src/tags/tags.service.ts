import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTagDto } from './dto/create-tag.dto.js';

const CACHE_KEY = 'cache:tags:all';
const CACHE_TTL = 3600;

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findAll() {
    const cached = await this.cache.get(CACHE_KEY);
    if (cached) return cached;

    const tags = await this.prisma.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
    await this.cache.set(CACHE_KEY, tags, CACHE_TTL);
    return tags;
  }

  async create(dto: CreateTagDto) {
    const tag = await this.prisma.prisma.tag.create({ data: dto });
    await this.cache.del(CACHE_KEY);
    return tag;
  }

  async remove(id: string) {
    const tag = await this.prisma.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.prisma.prisma.tag.delete({ where: { id } });
    await this.cache.del(CACHE_KEY);
    return null;
  }
}
