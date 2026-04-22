# Phase 3 — Route Guards + Polish

**Priority:** P1
**Status:** pending
**Depends on:** Phase 1, Phase 2

## Goal

Bảo vệ các route cần auth ở cả 2 FE, và polish UX (redirect `from`, loading splash khi đang refresh lần đầu).

## CMS (React Router v7)

### Files

**Create:**
- `cms_frontend/src/features/auth/components/protected-route.tsx`
- `cms_frontend/src/features/auth/hooks/use-bootstrap-auth.ts` — gọi refresh 1 lần khi app mount (nếu chưa có accessToken) để khôi phục session từ cookie.

**Modify:**
- `cms_frontend/src/router/index.tsx` — bọc `Home`, `Product` trong `<ProtectedRoute>`.
- `cms_frontend/src/main.tsx` (hoặc `providers/index.ts`) — thêm `useBootstrapAuth` ở layout root.

### Logic

```tsx
// protected-route.tsx
if (bootstrapLoading) return <Splash />;
if (!tokenService.getAccessToken()) return <Navigate to="/login" state={{ from: location }} replace />;
return <Outlet />;
```

`use-bootstrap-auth`: trên mount, nếu không có token → gọi `tokenService.refresh()`; set `ready=true` sau khi xong (thành công hay không).

## Next.js

### Files

**Create:**
- `frontend/features/auth/use-bootstrap-auth.ts` — client hook gọi refresh 1 lần.
- `frontend/components/auth-gate.tsx` — client wrapper bảo vệ subtree.

**Modify:**
- `frontend/app/providers.tsx` — chạy bootstrap ở provider level.
- (Không dùng middleware cho auth check vì token in-memory không có ở edge.)

### Logic

- `AuthGate` client component: nếu chưa bootstrap xong → splash; nếu xong + không có token → `router.replace('/login')`.
- Apply `<AuthGate>` trong layout của route group cần bảo vệ (e.g. `app/(protected)/layout.tsx` sau này). Hiện tại: demo ở `app/page.tsx` — wrap Home trong AuthGate.

## Todo

- [ ] CMS: `use-bootstrap-auth`, `protected-route`, wire router
- [ ] Next: `use-bootstrap-auth`, `auth-gate`, wrap home
- [ ] Test: login → reload → vẫn ở trong app (nhờ refresh cookie)
- [ ] Test: logout → click protected link → về `/login?from=...`

## Success Criteria

- Reload protected page khi có refresh cookie valid → không flash về login.
- Hết phiên → về login, sau khi login xong redirect về `from`.
- Unauth user gõ URL protected → chuyển login.

## Risks

- **Flash of login page** trong lúc bootstrap: giải quyết bằng splash state `ready=false`.
- **Infinite loop** nếu bootstrap refresh trả 401 nhưng AuthGate lại gọi tiếp: bootstrap chỉ chạy 1 lần (`useRef` guard).
<!-- Updated: G3 — ghi rõ StrictMode double-invoke và tại sao không phải bug -->
- **React StrictMode double-invoke (dev only)**: `useBootstrapAuth` dùng `useRef` guard — ref persist qua StrictMode re-mount nên effect chỉ chạy logic bootstrap 1 lần dù effect trigger 2 lần. Đây là behavior đúng — KHÔNG xóa StrictMode.
<!-- Updated: G4 — wire 'from' state/query param ở phase này -->
- **`from` redirect**: Phase 3 là nơi wire nguồn `from` — CMS dùng `location.state.from` (React Router), Next.js dùng `useSearchParams().get('from')`. Phase 1 và 2 đã dùng fallback `'/'` chờ Phase 3 hoàn thiện.

## Out of Scope

- Role-based authorization (ADMIN vs BUYER)
- Server-side session cho Next (cần httpOnly access cookie riêng — thay đổi BE)
