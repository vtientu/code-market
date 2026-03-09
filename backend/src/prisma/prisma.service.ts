import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@generated/prisma/client.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly prisma: PrismaClient;

  constructor() {
    // Prisma 7: in traditional Node.js the Query Engine reads DATABASE_URL from env.
    // The TS constructor type enforces adapter|accelerateUrl for Edge environments only.
    // Casting to a no-arg constructor bypasses the type mismatch safely.
    this.prisma = new (PrismaClient as unknown as new () => PrismaClient)();
  }

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
