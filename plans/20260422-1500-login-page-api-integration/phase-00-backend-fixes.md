# Phase 0 — Backend Fixes (Pre-requisite)

**Priority:** P0 — Blocker
**Status:** pending
**Depends on:** nothing
**Required by:** Phase 1, Phase 2, Phase 3

## Context Links

- `backend/src/main.ts` — CORS config (single origin, cần mở rộng)
- `backend/src/auth/auth.controller.ts` — cookie options (`sameSite: 'strict'`, `path: '/api/v1/auth'`)

## Overview

Hai FE (CMS `:5173` và Next.js `:3001`) đều cross-origin so với BE (`:3000`). Cần fix CORS và cookie config trước khi triển khai Phase 1 & 2, vì:

- CORS hiện chỉ cho phép 1 origin (`FRONTEND_URL`) — CMS sẽ bị block.
- `sameSite: 'strict'` ngăn browser gửi cookie trong mọi cross-site request — refresh call từ cả 2 FE sẽ không gửi được `refresh_token` cookie, khiến toàn bộ session bootstrap thất bại.

## Requirements

- CORS allow cả `CMS_URL` (`:5173`) lẫn `FRONTEND_URL` (`:3001`) cùng lúc.
- Cookie `sameSite` phải là `'lax'` (hoặc `'none'` + `secure` cho HTTPS prod) để browser gửi cookie trong cross-origin request.
- Không thay đổi logic auth, chỉ config.

## Related Code Files

**Modify:**
- `backend/src/main.ts` — đổi `origin` từ string sang array.
- `backend/src/auth/auth.controller.ts` — đổi `sameSite` từ `'strict'` sang `'lax'`.
- `backend/.env.example` — thêm `CMS_URL`.

## Implementation Steps

1. **Fix CORS origin** (`backend/src/main.ts`):
   Đổi `origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3001'` thành:
   ```ts
   origin: [
     process.env['CMS_URL'] ?? 'http://localhost:5173',
     process.env['FRONTEND_URL'] ?? 'http://localhost:3001',
   ],
   ```
   Giữ nguyên `credentials: true`.

2. **Fix cookie `sameSite`** (`backend/src/auth/auth.controller.ts`):
   Đổi `sameSite: 'strict' as const` thành `sameSite: 'lax' as const`.
   > Lý do: `'strict'` chặn cookie trên mọi cross-site request kể cả khi `credentials: include` — cả 2 FE đều cross-origin với BE port `:3000`. `'lax'` cho phép cookie gửi trong cross-origin request có `credentials: include`.

3. **Update `.env.example`**:
   Thêm dòng `CMS_URL=http://localhost:5173` để dev không bỏ sót.

4. Restart BE, kiểm tra response header: `Access-Control-Allow-Origin` phải match request origin, `Access-Control-Allow-Credentials: true`.

## Todo

- [ ] Fix CORS origin sang array trong `main.ts`
- [ ] Fix cookie `sameSite: 'lax'` trong `auth.controller.ts`
- [ ] Thêm `CMS_URL` vào `.env.example`
- [ ] Restart BE + verify CORS headers

## Success Criteria

- `OPTIONS /api/v1/auth/login` từ `http://localhost:5173` trả `Access-Control-Allow-Origin: http://localhost:5173`.
- `OPTIONS /api/v1/auth/login` từ `http://localhost:3001` trả `Access-Control-Allow-Origin: http://localhost:3001`.
- `POST /api/v1/auth/refresh` từ FE gửi kèm cookie `refresh_token` (verify qua Network tab → Request Headers → Cookie).
