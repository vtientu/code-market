# Codebase Summary

## Project Structure

```
code-market/
├── backend/                    # NestJS API (port 3000)
│   ├── src/
│   │   ├── auth/              # JWT authentication & authorization
│   │   ├── users/             # User management & profiles
│   │   ├── products/          # Product CRUD & versioning
│   │   ├── categories/        # Product categories (hierarchical)
│   │   ├── tags/              # Product tags
│   │   ├── cart/              # Shopping cart logic
│   │   ├── orders/            # Order placement & status
│   │   ├── payments/          # MOMO, VNPay, Wallet payment processing
│   │   ├── wallet/            # Seller wallet & earnings
│   │   ├── reviews/           # Product reviews & ratings
│   │   ├── licenses/          # Download licenses & tracking
│   │   ├── notifications/     # User notifications
│   │   ├── common/            # Shared guards, decorators, filters
│   │   ├── prisma/            # Database abstraction layer
│   │   └── main.ts            # App bootstrap
│   ├── prisma/
│   │   └── schema.prisma      # Database schema (18 models)
│   ├── test/                  # E2E tests
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
├── frontend/                   # Next.js UI (port 3001)
│   ├── app/
│   │   ├── (routes)/          # Page components (Server Components)
│   │   ├── api/               # Route Handlers (BFF proxy)
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Homepage
│   │   ├── env.ts             # Environment validation (Zod)
│   │   └── proxy.ts           # BFF proxy skeleton
│   ├── components/            # Reusable UI components
│   ├── lib/
│   │   ├── api/               # Axios HTTP client
│   │   └── utils/             # Utility functions
│   ├── hooks/                 # Custom React hooks (TanStack Query)
│   ├── public/                # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
├── cms_frontend/              # CMS interface (separate app)
└── README.md
```

## Module Inventory

### Backend Modules (NestJS)

| Module | Purpose | Key Files | Status |
|--------|---------|-----------|--------|
| **auth** | JWT auth, refresh tokens, strategies | auth.controller, auth.service, jwt.strategy, guards | Complete |
| **users** | User registration, profile management | users.service, profile.entity | Complete |
| **products** | CRUD, versioning, images, caching | products.service, product-query.dto, S3 integration | Complete |
| **categories** | Hierarchical category tree | categories.service, parent-child relations | Complete |
| **tags** | Product tags (many-to-many) | tags.service, product-tag relations | Complete |
| **cart** | Shopping cart operations | cart.service, add/remove items | Complete |
| **orders** | Order placement (transactional) | orders.service, order-item relations | Complete |
| **payments** | MOMO, VNPay, Wallet integration | payments.service, payment-callbacks | Complete |
| **wallet** | Seller earnings & balance tracking | wallet.service, transaction types | Complete |
| **reviews** | Product ratings & comments | reviews.service, 1 per user/product constraint | Complete |
| **licenses** | Download rights & version tracking | licenses.service, download counter | Complete |
| **notifications** | User notifications | notifications.service, types | Complete |
| **common** | Shared utilities | JwtAuthGuard, RolesGuard, ResponseInterceptor, HttpExceptionFilter | Complete |
| **prisma** | Database abstraction | PrismaService, repository pattern | Complete |

### Frontend Structure

| Section | Purpose | Status |
|---------|---------|--------|
| **app/(routes)/** | Server Components (pages) | Placeholder |
| **app/api/** | Route Handlers (BFF) | Skeleton |
| **components/** | React Components | Not started |
| **lib/api/** | Axios HTTP client | Basic setup |
| **hooks/** | TanStack Query hooks | Not started |

### CMS Frontend

Separate administrative interface (early stage).

## Technology Stack & Versions

### Backend Dependencies
- **NestJS**: 11.0.1
- **TypeScript**: 5.x
- **Prisma**: 7.4.2 (MariaDB/MySQL adapter)
- **JWT**: @nestjs/jwt 11.0.2
- **Auth**: passport-jwt 4.0.1, bcrypt 6.0.0
- **Cache**: cache-manager 7.2.8, @nestjs/cache-manager 3.1.0
- **Redis**: ioredis 5.10.0
- **AWS SDK**: @aws-sdk/client-s3 3.1005.0, @aws-sdk/s3-request-presigner 3.1005.0
- **Database**: @prisma/client 7.4.2, mariadb 3.5.2
- **Validation**: class-validator 0.15.1, class-transformer 0.5.1
- **API Docs**: @nestjs/swagger 11.2.6
- **Rate Limiting**: @nestjs/throttler 6.5.0
- **Config**: @nestjs/config 4.0.3

### Frontend Dependencies
- **Next.js**: 16.1.6 (App Router)
- **React**: 19.2.3
- **TypeScript**: 5.x
- **TailwindCSS**: 4.x
- **TanStack Query**: 5.90.21 (data fetching)
- **Axios**: 1.13.6 (HTTP client)
- **Zod**: 4.3.6 (env validation)
- **ESLint**: 9.x
- **Prettier**: 3.8.1

### Development Environment
- **Node.js**: 18+ (recommended)
- **Package Managers**: yarn (root), npm/yarn (workspaces)
- **Database**: MySQL 8+ (Prisma configured)
- **Cache**: Redis (required for auth tokens, product caching)
- **File Storage**: AWS S3 (presigned URLs)
- **Git Hooks**: Husky (root level)

## Key Files Reference

### Backend Configuration
- `backend/main.ts` — NestJS app bootstrap, Swagger setup
- `backend/app.module.ts` — Root module, all imports
- `backend/prisma/schema.prisma` — Database schema
- `.env.example` — Environment template

### Frontend Configuration
- `frontend/app/layout.tsx` — Root React layout
- `frontend/app/page.tsx` — Homepage
- `frontend/app/env.ts` — Zod env validation
- `frontend/next.config.js` — Next.js config
- `frontend/tsconfig.json` — TypeScript config

### Common Code Patterns
- `backend/src/common/guards/jwt-auth.guard.ts` — JWT middleware
- `backend/src/common/guards/roles.guard.ts` — RBAC
- `backend/src/common/decorators/roles.decorator.ts` — Role annotation
- `backend/src/common/filters/http-exception.filter.ts` — Global error handling
- `backend/src/common/interceptors/response.interceptor.ts` — Response formatting

## Database Schema Highlights

### Users & Auth
- User (id, email, username, passwordHash, role, isEmailVerified, isActive)
- Profile (id, userId, displayName, avatar, bio, website, github)

### Products
- Product (id, sellerId, categoryId, title, slug, description, price, status, demoUrl, thumbnailUrl, rating, reviewCount, rejectionReason)
- ProductVersion (id, productId, versionNumber, changelog, fileName, fileUrl, fileSize, isLatest)
- ProductImage (id, productId, imageUrl, sortOrder)
- ProductTag (productId, tagId) — many-to-many
- Category (id, name, slug, description, parentId) — self-referencing

### Orders & Payments
- Order (id, buyerId, status, totalAmount, createdAt, updatedAt)
- OrderItem (id, orderId, productId, price)
- Payment (id, orderId, amount, method, status, gatewayRef, paidAt)
- CartItem (id, userId, productId, addedAt)

### Seller Economics
- Wallet (id, userId, balance, createdAt, updatedAt)
- WalletTransaction (id, walletId, type, amount, status, description)
- PayoutRequest (id, walletId, amount, status, bankName, bankAccount, accountHolder, note, rejectionNote, processedAt)

### Other
- Review (id, productId, userId, rating, comment) — 1 per user/product
- License (id, userId, productId, orderId, licenseKey, downloadCount, latestVersionId, expiresAt)
- Notification (id, userId, title, body, isRead, link, createdAt)

## Enums

- **Role**: BUYER, SELLER, ADMIN
- **ProductStatus**: DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED
- **OrderStatus**: PENDING, PAID, CANCELLED, REFUNDED
- **PaymentStatus**: PENDING, COMPLETED, FAILED, REFUNDED
- **PaymentMethod**: MOMO, VNPAY, WALLET
- **WalletTransactionType**: EARNING, WITHDRAWAL, REFUND, PURCHASE
- **PayoutStatus**: PENDING, APPROVED, REJECTED, COMPLETED
- **WalletTransactionStatus**: PENDING, COMPLETED, FAILED

## Configuration & Environment

### Backend Environment Variables
```
DATABASE_URL=mysql://user:password@localhost:3306/code_market
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3001
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=code-market-bucket
MOMO_SECRET=xxx
MOMO_PARTNER_CODE=xxx
VNPAY_SECRET=xxx
VNPAY_TMNCODE=xxx
```

### Frontend Environment Variables
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Deployment Configuration

- **Backend Port**: 3000 (configurable)
- **Frontend Port**: 3001 (dev), configurable in next.config.js
- **API Prefix**: `/api/v1`
- **Swagger Docs**: `/api/docs` (backend)
- **Rate Limit**: 100 requests per 60 seconds (default)

## Status Summary

- **Backend**: Feature-complete API with all core modules
- **Frontend**: Architecture in place, UI components pending
- **Testing**: E2E test structure exists, unit tests to be added
- **Documentation**: Initial structure created, technical docs in progress
