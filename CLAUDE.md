# Claude Guidelines: Fullstack Market Project (NestJS & NextJS)

## Project Structure

Monorepo with two separate workspaces, each with their own package manager and dependencies:

- `frontend/` — Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript
- `backend/` — NestJS 11, TypeScript
- Root manages Husky git hooks only (yarn)

## 🛠 Tech Stack

- **Backend:** NestJS (Node.js), TypeScript, MySQL (Prisma), Redis (Caching/Queue).
- **Frontend:** NextJS (App Router), Tailwind CSS, TanStack Query.
- **Architecture:** Modular Architecture (Domain-driven design influence).

## 🔄 Data Flow Architecture (BFF Pattern)

```
Browser (Client Component)
  └─→ Next.js Server (Route Handlers / Server Actions)
        └─→ NestJS Backend API
              └─→ MySQL / Redis
```

- **Client Components** never call NestJS directly. All requests go through Next.js server.
- **Next.js Server** acts as BFF: forwards requests to NestJS, handles session/cookie, returns data to client.
- **Server Components** fetch data directly on the Next.js server side (no client roundtrip).

## 🎯 Backend Rules (Primary Focus)

### 1. Code Standards & Structure

- **Architecture:** Always follow the NestJS Modular pattern (`.module`, `.controller`, `.service`).
- **Data Access:** Use **Prisma** with the repository pattern via `PrismaService`. Avoid logic in Controllers.
- **Naming:** - Files: `kebab-case.module.ts`, `kebab-case.service.ts`.
  - Classes: `PascalCase`.
  - Methods/Variables: `camelCase`.
- **Validation:** Use `class-validator` and `class-transformer`. Always define DTOs for Request/Response.

### 2. Database & Market Logic

- **MySQL:** Use Transactions (`prisma.$transaction`) for critical market operations like "Place Order" or "Payment".
- **Security:** Ensure all endpoints have `Guard` (JWT/Role-based).
- **Performance:**
  - Use `Select` to avoid fetching unnecessary columns.
  - Implement Pagination for all list APIs (Products, Orders).
  - Apply Redis caching for frequent reads (Product details, Category tree).

### 3. API Response Design

- Standard format:
  ```json
  {
    "success": boolean,
    "data": any,
    "message": string,
    "statusCode": number
  }
  ```

## 🎨 Frontend Rules

### 1. API Call Architecture

- **Client Components:** Only call Next.js Route Handlers (`/api/*`) or Server Actions — never call NestJS directly.
- **Server Components:** Fetch directly from Next.js server to NestJS (server-to-server).
- **TanStack Query:** Use for client-side data fetching/mutation, pointing to `/api/*` Route Handlers.

### 2. Folder Structure

```
frontend/
├── app/
│   ├── (routes)/         # Page components (Server Components by default)
│   └── api/              # Route Handlers — proxy to NestJS backend
├── components/           # UI components (Client/Server)
├── lib/
│   ├── api/              # Fetch helpers calling NestJS (server side only)
│   └── utils/
└── hooks/                # Custom hooks (TanStack Query)
```

### 3. Naming & Standards

- Files: `kebab-case.tsx`, `kebab-case.ts`.
- Components: `PascalCase`.
- Hooks: `useCamelCase`.
- All Route Handlers live in `app/api/` and are responsible for forwarding requests and handling auth cookies.

## 🔒 Error Handling

- **Backend:** Use a global NestJS `ExceptionFilter` — never expose raw errors to the outside.
- **Frontend Route Handlers:** Catch errors from NestJS, return a normalized response to the client.
- **Client Components:** Every TanStack Query mutation/query must have an `onError` handler.

## 🗂 Git & Branch Strategy

- Branch prefix: `feature/`, `fix/`, `chore/`.
- Commit style: Conventional Commits — `feat:`, `fix:`, `refactor:`, `chore:`.
- Husky runs at root level and validates before every commit.
