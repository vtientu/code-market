# Login Page + API Integration

**Date:** 2026-04-22
**Scope:** Xây dựng trang Login cho cả `cms_frontend` (Vite+React) và `frontend` (Next.js), tích hợp với API auth có sẵn ở `backend` (NestJS).
**Principles:** YAGNI · KISS · DRY

## Backend API (đã có sẵn)

<!-- Updated: B1 — ghi rõ response shape thực tế từ ResponseInterceptor -->
- `POST /auth/login` — body: `{ email, password }` → BE trả `{ success, statusCode, message, data: { accessToken, user } }` (ResponseInterceptor wrapper). Client layer unwrap → consumer đọc `{ accessToken, user }` trực tiếp. + set cookie `refresh_token` httpOnly.
- `POST /auth/refresh` — đọc cookie, rotate, trả `{ success, ..., data: { accessToken } }`. Sau unwrap → `{ accessToken }`.
- `POST /auth/logout` — Bearer, clear cookie + cache.
- Base URL lấy từ env `VITE_API_URL` (cms) / `NEXT_PUBLIC_API_URL` (frontend).

## Response Unwrap Strategy

<!-- Updated: B1 — quyết định rõ ràng về unwrap strategy -->
Chọn option (a): **unwrap tại client layer**.
- `fetchClient` (CMS): response interceptor trả `body.data` thay vì full wrapper.
- `apiClient` (Next): axios response interceptor trả `response.data.data`.
- Benefit: toàn bộ hook/consumer đọc trực tiếp `{ accessToken, user }` mà không cần `.data.data`.

## Phases

<!-- Updated: B2/B3 — thêm Phase 0 là prerequisite bắt buộc -->
| # | Phase | Status |
|---|-------|--------|
| 0 | [Backend fixes — CORS + cookie (Blocker)](phase-00-backend-fixes.md) | [ ] Not started |
| 1 | [CMS login page (Vite+React)](phase-01-cms-login.md) — depends on Phase 0 | pending |
| 2 | [Next.js login page (App Router)](phase-02-next-login.md) — depends on Phase 0 | pending |
| 3 | [Route guard + polish](phase-03-guards-polish.md) — depends on Phase 1 & 2 | pending |

## Key Dependencies

- **Phase 0 phải hoàn thành trước Phase 1 & 2**: CORS và `sameSite` cookie cần được fix ở BE để FE call hoạt động cross-origin.
- BE `/auth/login` đang trả cookie `path: /api/v1/auth` — FE phải gọi đúng prefix `/api/v1` nếu BE mount global prefix (kiểm tra `main.ts`). Xác minh ở Phase 1 bước 1.
- `tokenService` (cms) đã có — chỉ thêm `login/logout` API layer + fix unwrap.
- `apiClient` (next) đã có interceptor refresh — chỉ thêm login mutation + page + guard + fix unwrap.

## Out of Scope

- Register/forgot-password UI
- Social login
- Remember-me persistence (access token vẫn in-memory)
- i18n
