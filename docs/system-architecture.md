# System Architecture

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Client                          │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Next.js Server (BFF)     │
                    │  - Route Handlers          │
                    │  - Server Components       │
                    │  - Session Management      │
                    │  - Cookie Handling         │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  NestJS Backend API        │
                    │  (Port 3000)               │
                    │  - 14 Modules              │
                    │  - JWT Auth + RBAC         │
                    │  - Business Logic          │
                    │  - Rate Limiting           │
                    │  - Swagger Docs            │
                    └──────────────┬──────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
    ┌───────────▼────────┐  ┌─────▼──────┐  ┌──────▼────────┐
    │   MySQL Database   │  │   Redis    │  │   AWS S3      │
    │   (Prisma 7)       │  │  (Cache)   │  │  (File Store) │
    │  - 18 Models       │  │ - Tokens   │  │ - Presigned   │
    │  - Transactions    │  │ - Products │  │   URLs        │
    │  - ACID            │  │ - Sessions │  │               │
    └────────────────────┘  └────────────┘  └───────────────┘
```

## BFF Data Flow Pattern

```
1. Browser → Next.js Route Handler
   - Route Handler receives request
   - Validates request body (Zod)
   - Extracts JWT from HttpOnly cookie

2. Next.js Route Handler → NestJS API
   - Forwards request to NestJS backend
   - Includes JWT in Authorization header
   - Handles response normalization

3. NestJS API → Database/Cache/External
   - Guards validate JWT
   - Controllers route to services
   - Services query Prisma/Redis/S3
   - Transactions ensure data consistency

4. Response → Next.js → Browser
   - Standard response format: { success, data, message, statusCode }
   - Next.js passes to TanStack Query
   - React component renders data
```

## Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────┐
│ REGISTRATION                                                │
│                                                             │
│  POST /auth/register → hash password → create user         │
│  → send verification email → user confirms → isEmailVerified
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ LOGIN                                                       │
│                                                             │
│  POST /auth/login                                           │
│  → validate email & password (bcrypt compare)              │
│  → create JWT access token (15m exp)                       │
│  → create JWT refresh token (7d exp)                       │
│  → store refresh token in Redis                            │
│  → set HttpOnly cookies (access + refresh tokens)          │
│  → return user + tokens to client                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROTECTED REQUEST                                           │
│                                                             │
│  Browser sends request with HttpOnly cookie (access token) │
│  → Next.js Route Handler extracts token from cookie        │
│  → Route Handler adds to Authorization header              │
│  → NestJS JwtAuthGuard validates token signature           │
│  → NestJS RolesGuard checks user.role vs @Roles()          │
│  → Request proceeds to controller → service                │
│  → Response returned to client                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TOKEN REFRESH (Automatic via TanStack Query)                │
│                                                             │
│  Access token expires (15m)                                │
│  → TanStack Query detects 401 response                     │
│  → Calls POST /auth/refresh with refresh token cookie      │
│  → NestJS validates refresh token in Redis                 │
│  → Creates new access token (15m)                          │
│  → Updates HttpOnly cookie                                 │
│  → Retries original request with new token                │
│  → User continues seamlessly                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ RBAC (Role-Based Access Control)                           │
│                                                             │
│  User has role: BUYER | SELLER | ADMIN                    │
│  → Controller endpoints use @Roles(Role.ADMIN)             │
│  → @UseGuards(JwtAuthGuard, RolesGuard)                    │
│  → RolesGuard compares req.user.role to @Roles()           │
│  → If role doesn't match → ForbiddenException              │
│  → Admin endpoints: /products/pending, /products/:id/status│
│  → Seller endpoints: /wallet, /products/create             │
│  → Buyer endpoints: /cart, /orders, /reviews               │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Relationships

```
┌─────────────┐
│    User     │  (id, email, username, role)
├─────────────┤
│ id (PK)     │
│ email       │
│ username    │
│ role        │  BUYER | SELLER | ADMIN
└──────┬──────┘
       │
       ├─────────1:1───────────┬──────────────────┐
       │                       ▼                  ▼
       │                   ┌────────┐        ┌──────────┐
       │                   │Profile │        │  Wallet  │
       │                   └────────┘        └──────────┘
       │
       ├─────────1:N───────────┬──────────────────┐
       │                       ▼                  ▼
       │                   ┌───────┐        ┌──────────┐
       │                   │Product│        │  Orders  │
       │                   │(sells)│        │(buys)    │
       │                   └───────┘        └──────────┘
       │
       ├─────────1:N─────────────┐
       │                         ▼
       │                    ┌──────────┐
       │                    │CartItems │
       │                    └──────────┘
       │
       └─────────1:N─────────────┐
                                 ▼
                            ┌──────────┐
                            │ Reviews  │
                            └──────────┘

┌─────────────┐
│   Product   │  (id, sellerId, categoryId, status)
├─────────────┤
│ id (PK)     │
│ sellerId(FK)│──────────▶ User
│ categoryId  │──────────▶ Category
│ status      │  DRAFT | PENDING_REVIEW | PUBLISHED | REJECTED
└──────┬──────┘
       │
       ├─────────1:N───────────┬────────────────────┐
       │                       ▼                    ▼
       │              ┌─────────────────┐   ┌──────────────┐
       │              │ProductVersion   │   │ProductImage  │
       │              │(downloadable)   │   │(thumbnails)  │
       │              └─────────────────┘   └──────────────┘
       │
       ├─────────1:N───────────┬────────────────────┐
       │                       ▼                    ▼
       │              ┌──────────────┐    ┌─────────────────┐
       │              │OrderItem     │    │License(purchase)│
       │              │(line items)  │    │(download rights)│
       │              └──────────────┘    └─────────────────┘
       │
       └─────────M:N─────────────┐
                                 ▼
                            ┌──────────┐
                            │ProductTag│
                            └──────────┘

┌──────────────┐
│    Order     │  (id, buyerId, status)
├──────────────┤
│ id (PK)      │
│ buyerId (FK) │──────────▶ User
│ status       │  PENDING | PAID | CANCELLED | REFUNDED
└──────┬───────┘
       │
       ├─────────1:N────────┐
       │                    ▼
       │             ┌──────────────┐
       │             │  OrderItem   │──────────▶ Product
       │             └──────────────┘
       │
       └─────────1:1─────────┐
                             ▼
                        ┌─────────┐
                        │ Payment │
                        │(gateway)│
                        └─────────┘

┌──────────────┐
│   Wallet     │  (id, userId)
├──────────────┤
│ id (PK)      │
│ userId (FK)  │──────────▶ User
│ balance      │  Decimal
└──────┬───────┘
       │
       └─────────1:N─────────────┬────────────────────┐
                                 ▼                    ▼
                        ┌──────────────────┐  ┌─────────────┐
                        │WalletTransaction │  │PayoutRequest│
                        │(EARNING, etc)    │  │(bank withdrawal)
                        └──────────────────┘  └─────────────┘

┌──────────────┐
│  Category    │  (self-referencing tree)
├──────────────┤
│ id (PK)      │
│ name         │
│ parentId (FK)│──────────▶ Category (parent)
│              │
│ children     │◀──────────┐ Category (self)
└──────────────┘
```

## Module Architecture

```
NestJS Backend Structure:

┌─────────────────────────────────────────────────────────┐
│              AppModule (Root)                           │
│  imports: [                                             │
│    ConfigModule,                                        │
│    ThrottlerModule,                                     │
│    CacheModule,                                         │
│    PrismaModule,                                        │
│    AuthModule,                                          │
│    UsersModule,                                         │
│    ProductsModule,                                      │
│    CategoriesModule,                                    │
│    TagsModule,                                          │
│    CartModule,                                          │
│    OrdersModule,                                        │
│    PaymentsModule,                                      │
│    WalletModule,                                        │
│    ReviewsModule,                                       │
│    LicensesModule,                                      │
│    NotificationsModule,                                 │
│  ]                                                      │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐       ┌─────────┐      ┌────────┐
    │ Auth    │       │ Products│      │ Orders │
    │ Module  │       │ Module  │      │ Module │
    └─────────┘       └─────────┘      └────────┘
         │                 │                │
         ├─►Controller     ├─►Controller   ├─►Controller
         ├─►Service        ├─►Service      ├─►Service
         ├─►DTO            ├─►DTO          ├─►DTO
         ├─►Guards         ├─►Guards       └─►Strategies
         └─►Strategies     └─►Caching

    ┌──────────┐      ┌──────────┐      ┌─────────┐
    │ Payments │      │ Wallet   │      │ Reviews │
    │ Module   │      │ Module   │      │ Module  │
    └──────────┘      └──────────┘      └─────────┘
        │                  │                  │
        ├─►Callbacks       ├─►Service        ├─►Service
        ├─►Service         ├─►Transactions   └─►DTO
        └─►DTO             └─►Payouts

    ┌──────────┐      ┌──────────┐      ┌─────────┐
    │Categories│      │  Tags    │      │ Licenses│
    │ Module   │      │ Module   │      │ Module  │
    └──────────┘      └──────────┘      └─────────┘
        │                  │                  │
        ├─►Service         ├─►Service        ├─►Service
        ├─►DTO             └─►DTO            ├─►DTO
        └─►Caching                           └─►Download URLs

    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │   Cart   │      │  Users   │      │Notification
    │ Module   │      │ Module   │      │  Module  │
    └──────────┘      └──────────┘      └──────────┘
        │                  │                  │
        ├─►Service         ├─►Service        ├─►Service
        ├─►DTO             └─►DTO            └─►DTO
        └─►Queries

Common Module:
    ├─► Decorators: @Roles()
    ├─► Guards: JwtAuthGuard, RolesGuard
    ├─► Filters: HttpExceptionFilter
    ├─► Interceptors: ResponseInterceptor
    └─► DTOs: PaginationDto
```

## Caching Strategy (Redis)

```
Product Cache:
  Key: "product:{slug}"
  TTL: 1 hour
  Invalidation: when product is updated/published/rejected
  Purpose: Reduce database queries for frequently viewed products

Category Tree:
  Key: "categories:tree"
  TTL: 24 hours
  Invalidation: when category added/updated
  Purpose: Hierarchical category fetching

Refresh Tokens:
  Key: "refresh_token:{userId}"
  TTL: 7 days (matches JWT exp)
  Purpose: Token validation & revocation

Sessions (optional):
  Key: "session:{sessionId}"
  TTL: depends on user preference
  Purpose: User session management
```

## File Storage (AWS S3)

```
Presigned URLs Workflow:

1. User uploads product file (seller)
   → Backend validates file
   → Generates S3 put presigned URL (15 min expiry)
   → Returns URL to frontend
   → Frontend uploads directly to S3

2. User buys product
   → Order created
   → License record created
   → ProductVersion file linked

3. User downloads product
   → Backend validates license (exists, not expired)
   → Generates S3 get presigned URL (5 min expiry)
   → Returns download link
   → Increments download counter
   → Frontend redirects user to signed URL

S3 Bucket Structure:
  /products/{productId}/{versionNumber}/source.zip
  /products/{productId}/images/{imageId}.jpg
  /temp/{userId}/{timestamp}/upload.zip  (before confirmation)

Security:
  - No credentials exposed to client
  - Presigned URLs are time-limited
  - Private bucket (CloudFront optional for images)
  - Versioning enabled for audit trail
```

## Payment Flow

```
Wallet Payment:
  1. User adds to cart
  2. User initiates checkout
  3. Select WALLET payment method
  4. Backend checks seller wallet balance
  5. Deduct from seller wallet (WITHDRAWAL transaction)
  6. Add to buyer (PURCHASE transaction)
  7. Order marked PAID
  8. Licenses created

MOMO Payment:
  1. User selects MOMO at checkout
  2. Backend generates MOMO request with:
     - Amount
     - Order ID
     - Webhook URL
  3. Backend returns redirect URL
  4. User redirected to MOMO payment page
  5. User completes payment at MOMO
  6. MOMO sends webhook callback
  7. Backend verifies signature
  8. If valid: Order marked PAID, create licenses
  9. User redirected to confirmation page

VNPay Payment:
  (Similar to MOMO, different gateway integration)

Transaction Safety:
  - Use Prisma transactions for multi-step operations
  - Order + Payment + License creation is atomic
  - If any step fails, entire transaction rolls back
  - Webhook idempotency (check if payment already processed)
```

## Product Review Workflow

```
Admin Review Process:

1. Seller uploads product
   → Status: DRAFT

2. Seller clicks "Submit for Review"
   → Status: PENDING_REVIEW
   → Notification sent to admin

3. Admin reviews:
   → Check product details, images, price
   → Run code checks (if applicable)
   → Verify compliance

4. Admin decision:
   a) APPROVE
      → Status: PUBLISHED
      → Product visible to buyers
      → Notification sent to seller
   
   b) REJECT
      → Status: REJECTED
      → rejectionReason populated (why rejected)
      → Notification sent to seller
      → Seller can edit & resubmit

5. Published product:
   → Listed in search/browse
   → Can be reviewed by buyers
   → Can be purchased
```

## Error Handling Architecture

```
Global Error Handling:

1. Application-Level Errors (thrown by services)
   → HttpException subclasses:
      - NotFoundException
      - BadRequestException
      - UnauthorizedException
      - ForbiddenException
      - ConflictException

2. NestJS Global Exception Filter (HttpExceptionFilter)
   → Catches all exceptions
   → Formats response: { success: false, data: null, message, statusCode }
   → Returns to client

3. HTTP Response Format:
   {
     "success": boolean,
     "data": any | null,
     "message": string,
     "statusCode": number
   }

4. Frontend (Next.js Route Handler)
   → Catches exceptions from NestJS
   → Returns normalized response
   → TanStack Query detects error
   → Component handles error state

5. Client-Side Error Handling:
   → TanStack Query onError callback
   → Display toast/modal to user
   → Log to error tracking service (optional)
```

## Rate Limiting

```
ThrottlerModule Configuration:

Default: 100 requests per 60 seconds

Per Endpoint Override:
  @Throttle(50, 60)  → 50 requests/min
  @Throttle(200, 60) → 200 requests/min
  @SkipThrottle()    → Disabled

Client Detection:
  - IP-based (default)
  - JWT sub (user ID) for authenticated requests
  - Custom guards for rate limit bypass (internal services)

Rate Limit Headers:
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1234567890
```

## Performance Optimization

```
Backend:
  ✓ Database indexing on frequently queried fields
  ✓ Redis caching for product/category reads
  ✓ Pagination (limit 100 per page max)
  ✓ Select only required fields from database
  ✓ Lazy loading of relationships
  ✓ Connection pooling (Prisma)

Frontend:
  ✓ Server Components for data fetching
  ✓ TanStack Query for client-side caching
  ✓ Code splitting via Next.js App Router
  ✓ Image optimization (Next.js Image)
  ✓ CSS: TailwindCSS with purging

Network:
  ✓ CDN for static assets (optional)
  ✓ Compression (gzip/brotli)
  ✓ HTTP/2 or HTTP/3
  ✓ Presigned URLs avoid server bottleneck
```

## Deployment Architecture

```
Development:
  Backend: localhost:3000
  Frontend: localhost:3001
  Database: localhost:3306 (MySQL)
  Redis: localhost:6379
  S3: localstack (optional)

Staging:
  Backend: staging-api.codemarket.com
  Frontend: staging.codemarket.com
  Database: RDS MySQL
  Redis: ElastiCache
  S3: AWS S3 bucket
  CDN: CloudFront

Production:
  Backend: api.codemarket.com (load balanced)
  Frontend: codemarket.com (CDN)
  Database: RDS MySQL (multi-AZ)
  Redis: ElastiCache (cluster mode)
  S3: AWS S3 (versioning, lifecycle)
  CDN: CloudFront
  SSL/TLS: AWS Certificate Manager
```

## Security Considerations

```
Authentication:
  ✓ JWT tokens in HttpOnly cookies (XSS-proof)
  ✓ Refresh token rotation (7 days)
  ✓ Token validation on every protected request

Authorization:
  ✓ Role-based access control (RBAC)
  ✓ Guards prevent unauthorized access
  ✓ Decorators document required roles

Data Protection:
  ✓ Passwords hashed with bcrypt (10+ rounds)
  ✓ HTTPS enforced
  ✓ SQL injection prevented (Prisma parameterization)
  ✓ XSS prevention (Next.js escaping)
  ✓ CSRF protection via SameSite cookies

API Security:
  ✓ Input validation (class-validator DTOs)
  ✓ Rate limiting (100 req/60s)
  ✓ Secrets in environment (never hardcoded)
  ✓ Presigned URLs for file download (no creds exposed)

Monitoring:
  ✓ Structured logging
  ✓ Error tracking (optional: Sentry)
  ✓ Health checks
  ✓ Uptime monitoring
```
