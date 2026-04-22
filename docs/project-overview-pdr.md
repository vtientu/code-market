# Code Market - Project Overview & PDR

## Project Vision

Code Market is a marketplace platform for buying and selling source code products. It enables developers, agencies, and entrepreneurs to monetize their code while providing buyers with access to ready-made solutions.

## Stakeholders

- **Sellers**: Developers publishing source code products
- **Buyers**: Developers purchasing code with licenses
- **Admins**: Platform moderators managing product reviews and compliance
- **Payment Gateways**: MOMO, VNPay, Wallet integration

## Core Features

### User Management
- User registration & authentication (JWT, refresh tokens)
- Role-based access control (Buyer, Seller, Admin)
- User profiles with customizable information
- Email verification & account security

### Product Management
- Source code product listing with versions
- Product versioning and changelog tracking
- Product images & demo URL support
- Admin review workflow (Draft → Pending Review → Published/Rejected)
- Product search, filtering, and categorization
- Star rating (1–5) and review system

### Shopping & Checkout
- Shopping cart functionality
- Multi-payment support (MOMO, VNPay, Wallet balance)
- Order placement with transaction safety
- Order history and status tracking

### Seller Features
- Wallet system for earnings tracking
- Transaction history (earnings, withdrawals, refunds)
- Payout requests to bank accounts
- Product analytics (sales count, rating)

### Licensing & Downloads
- License key generation per purchase
- Download count tracking
- License expiration (lifetime or time-limited)
- Version-specific downloads

### Support Features
- Shopping cart persistence
- Product notifications
- Review management
- Admin product approval workflow

## Data Models Overview

18 core models:
- **User**: Account & auth (Role: BUYER, SELLER, ADMIN)
- **Profile**: User details (display name, avatar, bio)
- **Category**: Hierarchical product categories (parentId tree)
- **Tag**: Product tags (many-to-many via ProductTag)
- **Product**: Source code listing (status: DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED)
- **ProductVersion**: Code versions with changelog & file storage
- **ProductImage**: Product gallery images
- **ProductTag**: Product-Tag relationship
- **Order**: Buyer purchase (status: PENDING, PAID, CANCELLED, REFUNDED)
- **OrderItem**: Per-product line items in an order
- **Payment**: Payment details (method: MOMO, VNPAY, WALLET; status: PENDING, COMPLETED, FAILED, REFUNDED)
- **Wallet**: Seller earnings (balance tracking)
- **WalletTransaction**: Earnings/withdrawals/refunds (type: EARNING, WITHDRAWAL, REFUND, PURCHASE)
- **PayoutRequest**: Bank withdrawal requests (status: PENDING, APPROVED, REJECTED, COMPLETED)
- **Review**: 1–5 star ratings with comments (1 per user/product)
- **CartItem**: Shopping cart entries
- **License**: Purchase-granted download rights & version tracking
- **Notification**: User notifications

## API Contracts Summary

### Authentication Endpoints
- `POST /api/v1/auth/register` — Register user
- `POST /api/v1/auth/login` — Login & receive JWT
- `POST /api/v1/auth/refresh` — Refresh access token
- `POST /api/v1/auth/logout` — Logout & clear cookies

### Product Endpoints
- `GET /api/v1/products` — List published products (paginated, filterable)
- `GET /api/v1/products/:slug` — Get product details (cached)
- `GET /api/v1/products/pending` — Admin: list pending review
- `PATCH /api/v1/products/:id/status` — Admin: approve/reject

### User Endpoints
- `GET /api/v1/users/profile` — Current user profile
- `PATCH /api/v1/users/profile` — Update profile

### Order Endpoints
- `POST /api/v1/orders` — Place order (transactional)
- `GET /api/v1/orders` — List user orders
- `GET /api/v1/orders/:id` — Order details

### Payment Endpoints
- `POST /api/v1/payments/momo` — MOMO payment callback
- `POST /api/v1/payments/vnpay` — VNPay payment callback
- `POST /api/v1/payments/wallet` — Wallet payment

### Cart Endpoints
- `GET /api/v1/cart` — Get cart items
- `POST /api/v1/cart` — Add to cart
- `DELETE /api/v1/cart/:itemId` — Remove from cart

### Wallet & Seller Endpoints
- `GET /api/v1/wallet` — Seller wallet balance & transactions
- `POST /api/v1/wallet/payout` — Request payout to bank
- `GET /api/v1/wallet/payouts` — Payout request history

### Review Endpoints
- `GET /api/v1/reviews/:productId` — Product reviews
- `POST /api/v1/reviews` — Create review
- `PATCH /api/v1/reviews/:id` — Update review

### License Endpoints
- `GET /api/v1/licenses` — User's purchased licenses
- `GET /api/v1/licenses/:licenseKey/download` — Download product version

### Notification Endpoints
- `GET /api/v1/notifications` — User notifications
- `PATCH /api/v1/notifications/:id/read` — Mark as read

## API Response Format

All endpoints return:
```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "statusCode": number
}
```

## Technology Stack

- **Backend**: NestJS 11, Node.js, TypeScript
- **Database**: MySQL 8 with Prisma 7
- **Cache**: Redis (product caching, refresh token storage)
- **File Storage**: AWS S3 (products, images, presigned URLs)
- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS 4, TanStack Query 5
- **Authentication**: JWT (access 15m, refresh 7d) with HttpOnly cookies
- **Payment Integration**: MOMO, VNPay, Wallet balance
- **Rate Limiting**: ThrottlerModule (100 req/60s default)

## Development Phases

### Phase 1: Backend API (Mostly Complete)
- Core modules: auth, users, products, orders, payments, wallet, reviews, cart
- Database schema & Prisma integration
- JWT + role-based access control
- Payment gateway integration (MOMO, VNPay, Wallet)
- Redis caching for products
- AWS S3 presigned URLs
- Swagger API documentation

### Phase 2: Frontend UI (Early Stage)
- Next.js app structure initiated
- Route handlers skeleton (BFF proxy pattern)
- Environment configuration (Zod)
- Axios client setup with JWT refresh queue
- Building components for: homepage, product list, product detail, cart, checkout, order history, seller dashboard

### Phase 3: Testing & Optimization
- Unit tests for services
- E2E tests for critical flows
- Performance optimization
- Security hardening

## Success Metrics

- Product approval workflow functional
- All payment gateways integrated
- User role-based features working
- Frontend MVP: homepage, product list, search, checkout
- Documentation complete & up-to-date
- 90%+ API test coverage

## Key Dependencies & Constraints

- Prisma migrations required before deployment
- S3 credentials must be configured for file uploads
- Redis must be running for caching & refresh tokens
- JWT secrets must be securely stored in environment
- Sellers must be verified before publishing products
- All transactions must be transactional (Prisma transactions)

## Next Steps

1. Complete frontend homepage & product listing UI
2. Implement shopping cart & checkout flow
3. Build seller dashboard (upload products, view sales, request payouts)
4. Add comprehensive unit & E2E tests
5. Security audit & performance optimization
6. Deploy to staging environment
7. User acceptance testing
8. Production deployment
