# Code Standards & Conventions

## Naming Conventions

### Files
- Use **kebab-case** for all files (`.ts`, `.tsx`, `.js`, `.jsx`)
- Example: `auth.service.ts`, `jwt-auth.guard.ts`, `product-query.dto.ts`
- Descriptive names that immediately convey purpose
- Pattern: `{feature}.{type}.ts`
  - `{type}` = service, controller, dto, guard, filter, interceptor, decorator, entity, repository, etc.

### Classes & Interfaces
- Use **PascalCase** for all class and interface names
- Example: `AuthService`, `JwtAuthGuard`, `ProductQueryDto`, `User`, `Product`
- Keep names concise but descriptive
- Suffixes:
  - `Service` — business logic
  - `Controller` — HTTP route handlers
  - `Guard` — authentication/authorization
  - `Filter` — exception handling
  - `Interceptor` — request/response transformation
  - `Decorator` — metadata annotation
  - `Dto` — data transfer object (request/response)
  - `Entity` — database model
  - `Repository` — data access layer (if using repository pattern)

### Functions & Methods
- Use **camelCase** for all function and method names
- Example: `findPublished()`, `updateProductStatus()`, `createPayment()`
- Action verbs: `get`, `find`, `create`, `update`, `delete`, `list`, `fetch`, `process`
- Private methods: prefix with `_` or use `#` (private field syntax)
- Example: `_validateToken()`, `#encryptPassword()`

### Variables & Constants
- Use **camelCase** for variables: `userId`, `productTitle`, `totalAmount`
- Use **UPPER_SNAKE_CASE** for constants: `MAX_FILE_SIZE`, `DEFAULT_PAGE_SIZE`, `JWT_ACCESS_EXPIRES_IN`
- Boolean variables: prefix with `is` or `has`: `isActive`, `hasError`, `isEmailVerified`
- React Hooks: prefix with `use`: `useProducts()`, `useAuth()`, `useFetchUser()`

### Environment Variables
- Use **UPPER_SNAKE_CASE**: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AWS_S3_BUCKET`
- Prefix with `NEXT_PUBLIC_` if used in browser (Next.js): `NEXT_PUBLIC_API_URL`
- Organize by domain: `JWT_*`, `AWS_*`, `MOMO_*`, `VNPAY_*`, `REDIS_*`

## File Size Management

### Code File Limits
- **Maximum 200 lines per file** (excluding tests)
  - Controllers should focus on routing & validation (150–180 lines max)
  - Services encapsulate business logic (150–200 lines)
  - Large files must be split into smaller, focused modules
- **Larger files**: extract utility functions, create separate service classes

### Documentation File Limits
- **Maximum 800 lines per Markdown file**
  - Split large docs into topic directories with index.md
  - Example: `docs/api/` → `docs/api/index.md`, `docs/api/authentication.md`, `docs/api/products.md`

### Monorepo Structure
- Backend (`backend/`) and Frontend (`frontend/`) are independent workspaces
- Each workspace manages its own `package.json`, `tsconfig.json`, `node_modules`
- Root `package.json` manages only Husky git hooks

## NestJS Architecture Patterns

### Module Structure
Every NestJS module follows a consistent structure:
```
feature/
├── {feature}.module.ts      # Module definition
├── {feature}.controller.ts  # Routes
├── {feature}.service.ts     # Business logic
├── dto/
│   ├── create-{feature}.dto.ts
│   ├── update-{feature}.dto.ts
│   └── {feature}-query.dto.ts
├── entities/
│   └── {feature}.entity.ts
├── guards/ (optional)
├── decorators/ (optional)
└── strategies/ (optional, for auth modules)
```

### Controllers
- Handle HTTP routing, validation, error responses
- Delegate business logic to services
- Apply guards & decorators for auth/RBAC
- Use Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`)
- Max 150–180 lines per controller file

Example:
```typescript
@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List published products' })
  findPublished(@Query() query: ProductQueryDto) {
    return this.productsService.findPublished(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }
}
```

### Services
- Encapsulate all business logic
- Use Prisma/repository pattern for data access (no raw SQL)
- Manage transactions for critical operations
- Cache frequently accessed data
- Max 150–200 lines per service file
- For large services, split into multiple focused services

Example:
```typescript
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheManager: Cache,
  ) {}

  async findPublished(query: ProductQueryDto) {
    // Implementation
  }

  async findBySlug(slug: string) {
    const cached = await this.cacheManager.get(`product:${slug}`);
    if (cached) return cached;
    // Fetch from DB...
  }
}
```

### DTOs (Data Transfer Objects)
- Define request/response validation using `class-validator`
- One DTO file per operation
- Use descriptive names: `CreateProductDto`, `UpdateProductStatusDto`, `ProductQueryDto`

Example:
```typescript
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDecimal()
  @IsPositive()
  price: number;

  @IsEnum(ProductStatus)
  status: ProductStatus;
}
```

### Guards (Authentication/Authorization)
- Apply at controller method level using `@UseGuards()`
- Guards for auth: `JwtAuthGuard`, `JwtRefreshGuard`
- Guard for RBAC: `RolesGuard` with `@Roles()` decorator
- All protected endpoints must have `@ApiBearerAuth()` in Swagger

Example:
```typescript
@Patch(':id/status')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
updateStatus(@Param('id') id: string, @Body() dto: UpdateProductStatusDto) {
  // Only admins can call this
}
```

### Error Handling
- Use global `HttpExceptionFilter` (common module)
- Throw `HttpException` or subclasses for known errors
- Let unhandled errors propagate to global filter
- Return standard error response format

Example:
```typescript
if (!product) {
  throw new NotFoundException('Product not found');
}

if (product.status !== ProductStatus.DRAFT) {
  throw new BadRequestException('Only draft products can be published');
}
```

## Database & Data Access (Prisma)

### Repository Pattern
- All data access via `PrismaService` (defined in `prisma/` module)
- Avoid calling Prisma client directly; use service methods
- Use transactions for critical operations (orders, payments)

Example:
```typescript
async placeOrder(buyerId: string, items: OrderItemInput[]) {
  return this.prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: { buyerId, totalAmount: 0 } });
    // Create order items, update wallet, etc.
    return order;
  });
}
```

### Query Optimization
- Use `select` to fetch only required fields
- Implement pagination for list endpoints (limit, offset)
- Add database indexes for frequently queried fields (status, userId, etc.)
- Cache frequently read data (products, categories)

Example:
```typescript
async findPublished(query: ProductQueryDto) {
  const { skip, take, categoryId, search } = query;
  return this.prisma.product.findMany({
    where: {
      status: ProductStatus.PUBLISHED,
      categoryId,
      title: { contains: search },
    },
    select: {
      id: true,
      title: true,
      price: true,
      rating: true,
      seller: { select: { username: true } },
    },
    skip,
    take: Math.min(take, 100), // Max 100 per page
  });
}
```

## Frontend Patterns (Next.js + React 19)

### File Organization
```
frontend/
├── app/
│   ├── (routes)/           # Server Components (pages)
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Homepage
│   │   └── products/       # Product pages
│   ├── api/                # Route Handlers (BFF)
│   │   ├── products/
│   │   ├── auth/
│   │   └── cart/
│   └── env.ts
├── components/             # React Components (Client & Server)
├── lib/
│   ├── api/                # HTTP client (Axios)
│   └── utils/              # Utilities
└── hooks/                  # Custom Hooks (TanStack Query)
```

### Naming Conventions
- Component files: `kebab-case.tsx`: `product-card.tsx`, `cart-modal.tsx`
- Component names: `PascalCase`: `ProductCard`, `CartModal`
- Hook files: `use-camelcase.ts`: `use-products.ts`, `use-auth.ts`
- Route files: `kebab-case/` or `[param].tsx`

### Server vs. Client Components
- **Server Components** (default): fetch data, access env vars, database calls (via Route Handlers)
- **Client Components**: interactive UI, hooks, event handlers
- Mark client components with `'use client'` directive
- Never call NestJS directly from client; always use Route Handlers

Example (Server Component):
```tsx
// app/(routes)/products/page.tsx
export default async function ProductsPage() {
  const products = await fetch('http://localhost:3000/api/v1/products')
    .then(r => r.json());
  return <ProductList products={products} />;
}
```

Example (Client Component):
```tsx
'use client';
import { useQuery } from '@tanstack/react-query';

export function ProductCard({ productId }) {
  const { data: product } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetch(`/api/products/${productId}`).then(r => r.json()),
  });
  return <div>{product?.title}</div>;
}
```

### Route Handlers (BFF Pattern)
- All route handlers in `app/api/`
- Route Handlers proxy requests to NestJS backend
- Handle authentication (JWT from cookies)
- Return normalized JSON responses

Example:
```typescript
// app/api/products/route.ts
export async function GET(request: NextRequest) {
  const response = await fetch('http://localhost:3000/api/v1/products', {
    headers: {
      'Authorization': `Bearer ${getTokenFromCookies(request)}`,
    },
  });
  return response.json();
}
```

### Hooks (TanStack Query)
- Custom hooks wrapping TanStack Query
- Query keys: `['resource', id, 'sub-resource']`
- Include error handling & loading states
- Example hook structure:

```typescript
// hooks/use-products.ts
export function useProducts(query?: ProductQueryDto) {
  return useQuery({
    queryKey: ['products', query],
    queryFn: async () => {
      const response = await fetch(`/api/products?${new URLSearchParams(query)}`);
      return response.json();
    },
  });
}
```

## Validation & Error Handling

### Backend Validation
- Use `class-validator` in DTOs
- Validate on controller method entry
- Use Pipes for auto-validation: `@Body() dto: CreateProductDto`
- Custom validators for complex logic

### Frontend Validation
- Use Zod for environment variables: `env.ts`
- Use client-side validation before submission (React form libraries)
- Server-side validation via Route Handlers

Example (env.ts):
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

## Testing Standards

### Unit Tests
- Test services in isolation
- Mock external dependencies (Prisma, cache, external APIs)
- Aim for 80%+ code coverage for services
- File pattern: `{feature}.service.spec.ts`

### E2E Tests
- Test complete user workflows
- Use real database (test database)
- Test API endpoints end-to-end
- Directory: `test/` with `jest-e2e.json`

### Test File Structure
```typescript
describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(ProductsService);
    prisma = module.get(PrismaService);
  });

  describe('findPublished', () => {
    it('should return published products', async () => {
      const result = await service.findPublished({});
      expect(result).toBeDefined();
    });
  });
});
```

## API Response Format (Standardized)

All backend endpoints return:
```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "statusCode": number
}
```

Implemented via `ResponseInterceptor` (common module).

## Security Standards

### Authentication
- JWT stored in HttpOnly, Secure cookies (not localStorage)
- Access token: 15 minutes
- Refresh token: 7 days (stored in Redis)
- Always validate tokens on protected endpoints

### Authorization
- RBAC via Roles enum & RolesGuard
- Endpoints explicitly state required roles
- Admin-only endpoints must check `@Roles(Role.ADMIN)`

### Data Protection
- Hash passwords with bcrypt (10+ rounds)
- Validate all inputs (DTOs with class-validator)
- Use Prisma transactions for multi-step operations
- Never expose internal errors to clients

### External APIs
- Use presigned URLs for S3 (time-limited, no credentials exposed)
- Payment gateway credentials stored in environment (never in code)
- Rate limiting enabled (100 req/60s default)

## Code Quality Guidelines

### DRY (Don't Repeat Yourself)
- Extract common logic into shared services
- Use decorators for cross-cutting concerns
- Reusable DTOs, guards, filters

### KISS (Keep It Simple)
- Prefer straightforward implementations
- Avoid deep nesting (max 3 levels)
- Clear method names that explain intent
- Add comments only for non-obvious logic

### YAGNI (You Aren't Gonna Need It)
- Only implement required features
- Avoid premature optimization
- Don't add unnecessary abstractions
- Remove dead code regularly

### Code Review Checklist
- [ ] Follows naming conventions
- [ ] File size under limits
- [ ] No duplicated code
- [ ] Error handling in place
- [ ] Tests pass (unit + E2E)
- [ ] Swagger docs updated
- [ ] No hardcoded secrets
- [ ] Follows NestJS/React patterns
- [ ] PR description explains changes

## Tooling & Formatting

### Linting
- Backend: ESLint (configured in `.eslintrc.json`)
- Frontend: ESLint (Next.js preset)
- Run: `yarn lint` (with auto-fix: `yarn lint --fix`)

### Formatting
- Prettier for code formatting
- Configuration: `.prettierrc` (root)
- Run: `yarn format`
- Enforced on commit via Husky

### TypeScript
- Strict mode enabled
- No `any` types allowed (use `unknown` if necessary)
- Explicit return types on functions
- Proper use of interfaces vs. types

## Commit Message Standards

Use Conventional Commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code restructuring (no behavior change)
- `test:` Adding/updating tests
- `chore:` Build, deps, tooling

Example:
```
feat: add product versioning to upload flow
fix: resolve JWT refresh token expiration
docs: update API documentation for orders
```

## Git Workflow

- Branch naming: `feature/`, `fix/`, `chore/`
- Main branch: `main` (production-ready)
- Dev branch (if used): `develop` (staging)
- PRs require code review before merge
- Commit frequently with clear messages
- No force pushes to main/develop
