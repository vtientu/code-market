import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { TagsModule } from './tags/tags.module.js';
import { ProductsModule } from './products/products.module.js';
import { CartModule } from './cart/cart.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { WalletModule } from './wallet/wallet.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { LicensesModule } from './licenses/licenses.module.js';

@Module({
  imports: [
    // Global config — reads .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Global rate limiting
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Global Redis cache
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: () => {
          const redis = new Redis({
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
          });
          // ioredis store compatible shape for cache-manager
          return {
            get: async (key: string) => redis.get(key),
            set: async (key: string, value: string, ttl?: number) => {
              if (ttl) await redis.set(key, value, 'EX', ttl);
              else await redis.set(key, value);
            },
            del: async (key: string) => redis.del(key),
            reset: async () => redis.flushdb(),
          };
        },
      }),
    }),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    CategoriesModule,
    TagsModule,
    ProductsModule,
    CartModule,
    NotificationsModule,
    OrdersModule,
    WalletModule,
    PaymentsModule,
    ReviewsModule,
    LicensesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
