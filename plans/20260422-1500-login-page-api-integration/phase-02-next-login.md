# Phase 2 — Next.js Login Page (App Router)

**Priority:** P0
**Status:** pending
**Stack:** Next.js 16 App Router, React 19, TanStack Query, axios (`apiClient`), zod, Tailwind v4.

## Context Links

- `frontend/lib/apiClient.ts` — axios + interceptor refresh (`/auth/refresh-token` ⚠️ **endpoint sai** — BE là `/auth/refresh`).
- `frontend/env.ts` — `NEXT_PUBLIC_API_URL`
- `frontend/app/layout.tsx`, `frontend/app/page.tsx` — root
- `backend/src/auth/auth.controller.ts`

## Key Insights

- `apiClient` đang gọi sai path refresh → fix `/auth/refresh-token` → `/auth/refresh`.
- Next.js 16: client component cho form. `useRouter` từ `next/navigation`.
- Access token chưa có chỗ lưu — cần thêm in-memory token holder + axios request interceptor để gắn `Authorization`.
<!-- Updated: B1 — ghi rõ response shape và strategy unwrap -->
- BE có `ResponseInterceptor` global — response shape thực tế: `{ success, statusCode, message, data: { accessToken, user } }`. Thêm axios response interceptor unwrap `response.data.data` để consumer đọc trực tiếp.
<!-- Updated: B2/B3 — CORS và sameSite đã được xử lý ở Phase 0 -->
- BE CORS + cookie `sameSite` đã được fix ở Phase 0. `withCredentials: true` (đã có) + Phase 0 done = refresh cookie hoạt động.

## Requirements

- Trang `/login`: form email + password (zod validate).
- Submit → `POST /auth/login` → lưu accessToken in-memory → router.push (`from` hoặc `/`).
- Hiển thị error từ axios `error.response.data.message`.
- QueryClient provider ở root nếu chưa có.
- Logout helper (chưa cần UI route, expose function).

## Architecture

```
frontend/
├── lib/
│   ├── apiClient.ts                  # fix refresh path + add request interceptor
│   ├── token-store.ts                # in-memory accessToken holder
│   └── query-client.tsx              # QueryClientProvider wrapper (client)
├── features/auth/
│   ├── auth-types.ts                 # zod schema + types
│   ├── auth-api.ts                   # login(), logout()
│   └── use-login.ts                  # mutation hook
├── app/
│   ├── layout.tsx                    # wrap with <Providers>
│   ├── providers.tsx                 # client providers root
│   └── login/
│       ├── page.tsx                  # server component shell
│       └── login-form.tsx            # client component form
```

## Files

**Create:**
- `frontend/lib/token-store.ts`
- `frontend/lib/query-client.tsx`
- `frontend/features/auth/auth-types.ts`
- `frontend/features/auth/auth-api.ts`
- `frontend/features/auth/use-login.ts`
- `frontend/app/providers.tsx`
<!-- Updated: G8 — dùng route group (auth) thay vì app/login/ để tránh AuthGate wrap -->
- `frontend/app/(auth)/login/page.tsx`
- `frontend/app/(auth)/login/login-form.tsx`

**Modify:**
<!-- Updated: B1, G1 — fix refresh endpoint, thêm response unwrap interceptor, xóa stale comment -->
- `frontend/lib/apiClient.ts` — fix refresh endpoint to `/auth/refresh`; add request interceptor inject `Authorization`; add response interceptor unwrap `response.data.data`; remove stale comment lines 49-51; on refresh success read unwrapped `accessToken` and update token-store.
- `frontend/app/layout.tsx` — bọc `<Providers>`.

## Implementation Steps

1. **`token-store.ts`**: pattern giống cms `tokenService` — `get/set/clear`. In-memory module variable.
<!-- Updated: G2 — explicit useState(() => new QueryClient()) pattern để tránh shared instance trên SSR -->
2. **`query-client.tsx`**: tạo `QueryClient` với `useState` lazy initializer để đảm bảo 1 instance per request (tránh shared state trên SSR):
   ```tsx
   'use client'
   const [client] = useState(() => new QueryClient())
   ```
3. **`providers.tsx`** (`'use client'`): wrap children với `QueryClientProvider client={client}`.
4. **`layout.tsx`**: import + bọc `{children}` trong `<Providers>`.
5. **Fix `apiClient.ts`**:
   - Request interceptor: nếu `tokenStore.get()` → set `Authorization: Bearer ...`.
   - Sửa `apiClient.post("/auth/refresh-token")` → `/auth/refresh`.
<!-- Updated: B1 — apiClient response interceptor unwrap response.data.data, consumer nhận LoginResponse trực tiếp -->
   - Thêm response interceptor để unwrap: `return response.data.data ?? response.data` — consumer đọc `{ accessToken, user }` trực tiếp, không cần `.data.data`.
   - Trong refresh interceptor: sau khi refresh thành công, lấy `accessToken` từ response đã được unwrap → `tokenStore.set(accessToken)` rồi retry queue.
<!-- Updated: G1 — xóa stale comment trong apiClient.ts lines 49-51 -->
   - Xóa comment ở `apiClient.ts` lines 49-51 ngụ ý cookie-based refresh — không còn chính xác sau khi có token-store + response unwrap.
<!-- Updated: G7 — thêm note zod v4 -->
6. **`auth-types.ts`** — dùng **zod v4 API** (`frontend/package.json` có `zod ^4.3.6`; tránh tra cứu docs v3):
   ```ts
   export const loginSchema = z.object({
     email: z.string().email(),
     password: z.string().min(6),
   });
   export type LoginInput = z.infer<typeof loginSchema>;
   export interface AuthUser { id: string; email: string; username: string; role: string }
   export interface LoginResponse { accessToken: string; user: AuthUser }
   ```
<!-- Updated: B1 — auth-api.ts dùng .then(r => r.data), sau unwrap interceptor r.data là LoginResponse -->
7. **`auth-api.ts`**: `login(input)` → `apiClient.post<LoginResponse>('/auth/login', input).then(r => r.data)`. Sau khi response interceptor unwrap, `r.data` là `LoginResponse` trực tiếp.
<!-- Updated: G4 — fallback navigate('/') nếu không có 'from', defer sang Phase 3 -->
8. **`use-login.ts`**: `useMutation` → onSuccess `tokenStore.set(data.accessToken)` + `router.push(from ?? '/')`. **Phase 2 dùng fallback `'/'`** — nguồn `from` (`useSearchParams().get('from')`) sẽ được wire ở Phase 3.
<!-- Updated: G8 — KHÔNG bọc /login trong AuthGate, tạo route group (auth) ngay từ Phase 2 -->
9. **Route group cho login page**: tạo `frontend/app/(auth)/login/page.tsx` (server component) thay vì `frontend/app/login/page.tsx`. Route group `(auth)` đảm bảo `/login` KHÔNG bị bọc trong AuthGate khi Phase 3 tạo `app/(protected)/layout.tsx`. **Tuyệt đối không wrap `/login` trong AuthGate — infinite redirect.**
<!-- Updated: G9 — thêm redirect nếu đã đăng nhập -->
10. **`login-form.tsx`** (`'use client'`): thêm `useEffect` — nếu `tokenStore.get()` tồn tại khi mount → `router.replace('/')` ngay (tránh user đã login vào lại trang login). Controlled inputs, zod parse on submit, gọi `useLogin().mutate`. Disable button khi pending. Show error.
11. Chạy `yarn build` (Next type-check).

## Todo

- [ ] Add token-store + query-client provider (`useState` lazy init) + Providers wrapper
- [ ] Wire layout.tsx
- [ ] Fix apiClient: refresh path + request interceptor + response unwrap interceptor + remove stale comment
- [ ] Create auth feature (types/api/hook) — dùng zod v4 API
- [ ] Create `app/(auth)/login/` route group + form với redirect-if-logged-in
- [ ] `yarn build` passes

## Success Criteria

- `/login` render, submit thành công → push `/`.
- Sai credential → error message hiển thị.
- Reload → access token mất, lần request đầu nhận 401 → interceptor refresh → retry success.
- BE error message tiếng Anh hiển thị nguyên bản.

## Risks

<!-- Updated: B2/B3 — CORS và sameSite giờ được xử lý ở Phase 0 -->
- **CORS**: đã được giải quyết ở Phase 0. Phase 2 giả định Phase 0 đã hoàn thành (origin array + `sameSite: 'lax'`).
- **Refresh queue**: hiện chỉ resolve `null`, retry không có token mới. Sau fix response unwrap + token-store, request interceptor tự đọc token mới khi retry.
- **SSR token**: server components không có access token → mọi auth fetch nên ở client (TanStack Query) cho đến khi có session strategy.
<!-- Updated: G3 — ghi chú StrictMode double-invoke và tại sao useRef xử lý đúng -->
- **React StrictMode double-invoke**: `main.tsx`/`layout.tsx` có StrictMode → effects chạy 2 lần trong dev. `useRef` guard trong `use-bootstrap-auth` (Phase 3) xử lý đúng vì ref persist qua re-mount — KHÔNG xóa StrictMode khi thấy effect chạy 2 lần.

## Security

- Token in-memory, không localStorage.
- HttpOnly refresh cookie (BE đã có).
- Zod validate input trước khi gửi.
- Không log password.
