# Phase 1 — CMS Login Page (Vite + React)

**Priority:** P0
**Status:** pending
**Stack:** React 19, React Router v7, TanStack Query, Tailwind v4, shadcn (button), existing `fetchClient` + `tokenService`.

## Context Links

- `cms_frontend/src/lib/fetchClient.ts` — đã redirect `/login` khi 401 refresh fail
- `cms_frontend/src/lib/tokenService.ts` — in-memory access token + refresh call
- `cms_frontend/src/router/index.tsx` — hiện chỉ có Home, Product
- `backend/src/auth/auth.controller.ts` — `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`

## Key Insights

- `tokenService.refresh()` hiện đang fetch thẳng `/auth/refresh` (không qua BASE_URL). Cần xác minh dev có proxy hay sửa dùng `VITE_API_URL`. **Fix trong phase này.**
- Refresh cookie path ở BE là `/api/v1/auth` → BE có global prefix `api/v1`. `VITE_API_URL` phải include `/api/v1` (verify `backend/src/main.ts`).
- AccessToken không persist qua reload (in-memory). Chấp nhận: sau reload, refresh cookie sẽ tự lấy access token mới qua interceptor 401.

## Requirements

- Form fields: `email`, `password` với validation client-side (required, email format, password ≥ 6).
- Submit → `POST /auth/login` → lưu accessToken vào `tokenService` → redirect về `/` (hoặc `from` query).
- Hiển thị loading state, error message từ BE (`body.message`).
- Nếu đã đăng nhập (có accessToken trong memory) → redirect `/` ngay khi mount.
- Logout button ở layout (tối thiểu): gọi `POST /auth/logout`, clear token, redirect `/login`.

## Architecture

<!-- Updated: S1 — chuẩn hóa tên file sang kebab-case theo development-rules.md -->
<!-- Updated: S2 — loại bỏ useAuth.ts khỏi Architecture vì không có implementation step tương ứng (YAGNI) -->
```
features/auth/
├── types/auth.types.ts          # LoginRequest, LoginResponse, AuthUser
├── keys/auth-keys.ts            # QK: ['auth','me']
├── api/auth-api.ts              # login(), logout() via fetchClient
├── hooks/use-login.ts           # useMutation
└── components/login-form.tsx    # form UI
pages/
└── Login.tsx                    # route target, renders LoginForm
router/index.tsx                 # add /login route, wrap protected routes
```

## Files

**Create:**
- `cms_frontend/src/features/auth/types/auth.types.ts`
- `cms_frontend/src/features/auth/keys/auth-keys.ts`
- `cms_frontend/src/features/auth/api/auth-api.ts`
- `cms_frontend/src/features/auth/hooks/use-login.ts`
- `cms_frontend/src/features/auth/hooks/use-logout.ts`
- `cms_frontend/src/features/auth/components/login-form.tsx`
- `cms_frontend/src/features/auth/index.ts`
- `cms_frontend/src/pages/Login.tsx`
- `cms_frontend/src/components/ui/input.tsx` (shadcn input — chưa có)
- `cms_frontend/src/components/ui/label.tsx`

**Modify:**
- `cms_frontend/src/lib/tokenService.ts` — dùng `VITE_API_URL` cho `refresh()`, tránh race (return shared promise).
- `cms_frontend/src/router/index.tsx` — thêm `/login`.

## Implementation Steps

<!-- Updated: B5 — ghi chú rõ pattern useUsers.ts bị broken trước khi dùng làm reference -->
> **Lưu ý trước khi bắt đầu:** `cms_frontend/src/features/users/hooks/useUsers.ts` hiện **broken** — `getUserList` gọi `useQuery` nhưng không return kết quả, thiếu `queryFn`, sai shape `queryKey`. **Không dùng làm reference pattern.** Xem `use-login.ts` bên dưới làm mẫu đúng cho TanStack Query v5.

1. **Verify BE prefix**: đọc `backend/src/main.ts` + `.env.example` → xác nhận `VITE_API_URL` pattern (e.g. `http://localhost:3000/api/v1`).
<!-- Updated: G6 — thêm fallback nếu không có components.json -->
2. **Add shadcn input/label**: chạy `yarn shadcn@latest add input label`. Nếu lệnh fail do thiếu `components.json` → tạo thủ công `input.tsx` và `label.tsx` theo pattern của `button.tsx` hiện có.
3. **Types** (`auth.types.ts`):
   ```ts
   export interface LoginRequest { email: string; password: string }
   export interface AuthUser { id: string; email: string; username: string; role: 'BUYER'|'SELLER'|'ADMIN' }
   export interface LoginResponse { accessToken: string; user: AuthUser }
   ```
<!-- Updated: B1 — fetchClient unwrap response tại client layer, consumer nhận LoginResponse trực tiếp -->
4. **Unwrap response tại `fetchClient`**: thêm response interceptor vào `fetchClient` để trả `body.data` thay vì full wrapper `{ success, statusCode, message, data }`. Sau bước này, `fetchClient.post<LoginResponse>(...)` resolve thành `LoginResponse` trực tiếp (không cần `.data.data` tại call-site).
<!-- Updated: G1 — xóa stale comment ở apiClient.ts (áp dụng tương tự cho fetchClient nếu có) -->
5. **Xóa stale comment** trong `fetchClient.ts` nếu có comment nào ngụ ý cookie-based refresh không còn chính xác (đối chiếu với strategy unwrap mới).
6. **API** (`auth-api.ts`): `login(body)` → `fetchClient.post<LoginResponse>('/auth/login', body)`; `logout()` → `fetchClient.post('/auth/logout', {})`. Sau khi fetchClient unwrap, `data` trả về là `LoginResponse` trực tiếp.
<!-- Updated: G4 — fallback navigate('/') nếu không có 'from', defer state/query param sang Phase 3 -->
7. **Hook `use-login.ts`**: `useMutation` → onSuccess `tokenService.setAccessToken(data.accessToken)` + `queryClient.setQueryData(['auth','me'], data.user)` + `navigate(from ?? '/')`. **Phase 1 dùng fallback `'/'`** — nguồn `from` (React Router `location.state.from`) sẽ được wire ở Phase 3.
<!-- Updated: G5 — ghi rõ thứ tự: wait for API trước, clear token sau -->
8. **Hook `use-logout.ts`**: `useMutation` gọi `POST /auth/logout` (cần Bearer token). Dùng `onSuccess` (không phải `onSettled`) để clear token và `queryClient.clear()` — đảm bảo token vẫn còn khi request logout bay đi. Nếu API logout fail (network), vẫn clear token trong `onError` để không kẹt session.
9. **`login-form.tsx`**: controlled inputs, `onSubmit` → gọi `useLogin().mutate`, disable khi `isPending`, hiển thị `error.message`.
10. **`pages/Login.tsx`**: center layout, card với `LoginForm`. Guard: nếu `tokenService.getAccessToken()` → `<Navigate to="/" />`.
11. **Router**: thêm `{ path: '/login', element: <Login /> }`. (Route guard chung xử lý ở Phase 3.)
<!-- Updated: B4 — đây là blocker, không phải polish — nâng lên thành numbered step -->
12. **Fix `tokenService.refresh()` [BLOCKER]**: đổi URL từ `/auth/refresh` (relative, resolve về FE origin → 404) thành `${import.meta.env.VITE_API_URL}/auth/refresh`. Thêm `refreshPromise` singleton để tránh race condition khi nhiều request 401 song song. **Không có bước này, interceptor refresh không bao giờ hoạt động.**
<!-- Updated: B1 — fix tokenService.refresh đọc đúng shape sau khi fetchClient unwrap -->
   Sau khi fetchClient unwrap ở bước 4, `tokenService.refresh()` đọc `data.accessToken` — **đúng shape** (không còn là `data.data.accessToken`). Verify lại sau khi implement bước 4.
13. Chạy `yarn build` để type-check.

## Todo

- [ ] Verify BE global prefix + env sample
- [ ] Add shadcn `input`, `label` (fallback: tạo thủ công theo `button.tsx`)
- [ ] Add response unwrap interceptor vào `fetchClient`
- [ ] Remove stale comment trong `fetchClient.ts` nếu có
- [ ] Create auth feature module (types/api/hooks/components)
- [ ] Create Login page
- [ ] Add `/login` route
- [ ] Fix `tokenService.refresh()` URL + singleton [BLOCKER]
- [ ] Verify `tokenService.refresh()` đọc đúng `data.accessToken` sau unwrap
- [ ] `yarn build` passes

## Success Criteria

- Nhập email/password đúng → redirect `/`, các request tiếp theo có `Authorization: Bearer`.
- Sai credentials → hiển thị message từ BE (“Invalid credentials”).
- Reload sau login: refresh interceptor tự lấy access token mới, user vẫn ở trong app.
- Logout → token clear, next protected request redirect `/login`.

## Risks

- **Race khi refresh**: nhiều request 401 cùng lúc → nhiều `/auth/refresh` song song, có thể rotate loạn. Mitigation: singleton promise ở `tokenService.refresh`.
<!-- Updated: B2/B3 — CORS và sameSite giờ được xử lý ở Phase 0, không còn là risk mở -->
- **CORS + cookie**: đã được giải quyết ở Phase 0 (origin array + `sameSite: 'lax'`). Phase 1 giả định Phase 0 đã hoàn thành.
- **Cookie path `/api/v1/auth`**: browser gửi cookie khi `credentials: include` và path match. Verify trong dev sau khi Phase 0 done.

## Security

- Access token in-memory only (đúng pattern hiện tại — giảm XSS risk).
- Refresh token httpOnly cookie (BE đã set).
- Không log password, không echo token vào URL.
