# Plan Review: Login Page + API Integration

**Plan:** `plans/20260422-1500-login-page-api-integration/`
**Date:** 2026-04-22
**Reviewer:** plan-reviewer

## Verdict: NEEDS REVISION

The plan has sound architecture and follows YAGNI/KISS, but misses a critical assumption about the backend response shape — without fixing this, the entire login flow will **fail in Phase 1 & 2**. Additional gaps around CORS, cross-origin cookies, and TanStack Query v5 API need to be addressed before coding.

---

## 🔴 Blockers (must resolve before implementing)

### B1. Response shape — plan ignores `ResponseInterceptor` wrapper

Backend has a global `ResponseInterceptor` (`backend/src/common/interceptors/response.interceptor.ts`) wrapping all responses:
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { accessToken, user } }
```

Phase 1 step 4 and Phase 2 step 7 write as if `fetchClient.post<LoginResponse>(...)` / `apiClient.post<LoginResponse>(...)` returns `{ accessToken, user }` directly. Actual shape requires reading `response.data.data.accessToken`.

Also affects `tokenService.refresh()` (line 25: `data?.accessToken`) — if interceptor is active, `data` is `{ success, statusCode, message, data: { accessToken } }`.

**Required action:** Choose one:
- (a) Unwrap at client layer (`fetchClient` / `apiClient` response interceptor) — return `body.data`. Benefit: all hooks read directly after.
- (b) Keep as-is, read `.data.data` at each call — verbose.

Document the choice in Phase 1 + Phase 2. Also fix `tokenService.refresh` and `apiClient` refresh interceptor.

### B2. CORS — backend only allows 1 origin, blocks one of 2 FEs

`backend/src/main.ts` lines 19-22:
```ts
origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3001'
```
Only 1 origin. CMS (Vite, typically `:5173`) and Next.js (`:3001`) cannot coexist. Plan Phase 2 marks CORS as "out of scope — don't touch BE" — but Phase 3 success criteria requires "reload protected page... no flash to login", which cannot be tested if CORS blocks one FE.

**Required action:** Either extend `origin` to array/function in BE (separate phase), or confirm dev flow is test-one-at-a-time and document it.

### B3. Cookie `sameSite: 'strict'` + `path: '/api/v1/auth'` — cross-origin requests will NOT send cookie

`auth.controller.ts` lines 19-25:
```ts
sameSite: 'strict' as const,
path: '/api/v1/auth',
```

With `sameSite: 'strict'`, browsers do **not** send the cookie in any cross-site request (even with `credentials: include`). Both FEs are cross-origin relative to BE (`:3000`). Plan notes `credentials: include` but does not catch that `sameSite: strict` blocks cookies when:
- CMS `:5173` calls `:3000/api/v1/auth/refresh` → cookie NOT sent.
- Next `:3001` same.

This is a current BE bug. Plan must either:
- Note that BE needs to change `sameSite` to `'lax'` (or `'none'` + `secure`) — make it Phase 0 or a separate phase.
- Or switch to same-origin via Next.js/Vite proxy (dev-only, not suitable for prod).

**If not fixed: login succeeds but refresh will fail immediately, session bootstrap in Phase 3 will not work.**

### B4. `tokenService.refresh()` URL `/auth/refresh` is relative — resolves to FE origin, not BE

Phase 1 step 10 notes this fix in the todo list only. Needs to be flagged as BLOCKER priority, not optional polish — the 401 refresh interceptor is **never functional** with current code (it calls `http://localhost:5173/auth/refresh` → 404 HTML).

### B5. `useUsers.ts` does not return `useQuery` — current pattern is broken

`cms_frontend/src/features/users/hooks/useUsers.ts`:
```ts
export const getUserList = (params: IUsersParams) => {
  useQuery({ queryKey: userKeys.list });  // Not returned, missing queryFn, wrong queryKey shape
};
```

Phase 1 step 5 intends to "follow existing pattern" — but the pattern is **broken**. Note this explicitly or fix the pattern first to avoid copying it. TanStack Query v5 requires `queryFn` (unless a default is set). Plan's `useMutation` usage is fine, but this should be flagged.

---

## 🟡 Gaps (should clarify)

### G1. Comment in `apiClient.ts` contradicts plan's fix direction

Phase 2 correctly identifies that refresh returns `{ accessToken }` in body (not a new Set-Cookie). But `apiClient.ts` lines 49-51 has a comment implying cookie-based refresh. Removing the stale comment should be noted in the implementation steps.

### G2. `QueryProvider` in Next.js — no `useState` → shared QueryClient across SSR requests

Phase 2 step 2 notes "1 instance per request via `useState`" — OK. But the required pattern needs to be explicit:
```tsx
'use client'
const [client] = useState(() => new QueryClient())
```

### G3. `useBootstrapAuth` + React StrictMode double-invoke

Phase 3 uses `useRef` guard. `main.tsx` has `StrictMode` → effects run twice in dev. `useRef` handles this correctly (ref persists), but note it explicitly so devs don't think it's a bug and remove `StrictMode`.

### G4. `useLogin.ts` + `'from'` query param — source not defined until Phase 3

Phase 1 step 5 and Phase 2 step 8 write `navigate(from)`, but the `from` source (React Router `location.state.from` vs Next `useSearchParams().get('from')`) isn't defined until Phase 3 creates ProtectedRoute. Suggestion: fallback to `/` if no `from` in Phase 1/2, add state/query param in Phase 3.

### G5. Logout API call order vs. token clear

Phase 1 step 6: "onSettled clear token, `queryClient.clear()`". But `POST /auth/logout` requires `JwtAuthGuard` (Bearer token). Clearing token before/parallel to request → 401 → refresh interceptor → potential loop.

Note explicitly: wait for `onSettled` to complete before clearing. Also `queryClient.clear()` in `onSettled` cancels `useAuth` query before navigate — confirm this doesn't cause subtree render errors.

### G6. Shadcn input/label — `components.json` not verified

Phase 1 step 2 runs `yarn shadcn@latest add input label`. `cms_frontend` has `shadcn` dep but `components.json` presence is unconfirmed. If missing → command will fail with init prompt. Add fallback: "if no `components.json`, manually create following `button.tsx` pattern."

### G7. Zod v4 in Next frontend — API differs from v3

`frontend/package.json` has `zod ^4.3.6`. `z.string().email()` still works, but `z.infer` and error shape differ. Phase 2 step 6 uses `z.string().email()` — fine, but add a note "use zod v4 API" to avoid devs referencing v3 docs.

### G8. Next.js login page — no route group decision, risk of wrapping `/login` in AuthGate

Plan Phase 3 notes "Apply `<AuthGate>` in route group layout... `app/(protected)/layout.tsx` later. For now: demo in `app/page.tsx`." This creates tech debt and risk: if dev wraps `/login` in AuthGate → infinite redirect. Note explicitly: **DO NOT wrap `/login` in AuthGate**, or extract `/login` to `app/(auth)/login/page.tsx` immediately in Phase 2.

### G9. Phase 2 missing "redirect from /login if already logged in"

Phase 1 step 8 has this (check `tokenService.getAccessToken()` → `<Navigate to="/" />`). Phase 2 does not have the equivalent. Add to `login-form.tsx` client effect.

### G10. `fetchClient` type parameter will be incorrect with response wrapper (linked to B1)

`fetchClient.post<LoginResponse>(...)` casts the wrapper `{ success, data: LoginResponse }` to `LoginResponse` → runtime crash reading `.accessToken`. Tied to B1 — needs unified decision.

---

## 🟢 Suggestions (optional)

### S1. File naming inconsistency: `authKeys.ts` vs `auth-keys.ts`

Plan Architecture uses `authKeys.ts`, Files list uses `auth-keys.ts`. `development-rules.md` says kebab-case. Current `userKeys.ts` uses camelCase. Pick one — recommend kebab-case per CLAUDE rule.

### S2. `useAuth` hook listed in Architecture but no implementation step

Phase 1 Architecture lists `hooks/useAuth.ts` but Implementation Steps have no step to create it. Remove from Architecture or add the step.

### S3. No test phase

Per `primary-workflow.md`, implementation must be followed by `tester` agent. Plan has manual testing in Phase 3 checklist but no unit/integration tests. Add Phase 4 (optional) or note per-phase.

### S4. Error message language inconsistency

Phase 2 displays BE error messages in English as-is. `fetchClient` has `"Phiên đăng nhập hết hạn"` (Vietnamese). Not consistent. Since i18n is out-of-scope, pick one language.

### S5. No rollback strategy mentioned

Plan creates new files + modifies ~4 existing files. Rollback is simple (revert commit). Add 1-line note for clarity.

### S6. Two different refresh singleton patterns across FEs

CMS uses "shared promise singleton". Next uses "isRefreshing flag + queue". Two patterns — acceptable given fetch vs axios idiomatic differences, but note intentional DRY break.

### S7. `NEXT_PUBLIC_APP_URL` optional in `env.ts`

Phase 3 may need absolute `APP_URL` for redirects. Currently `optional()`. Update schema if Phase 3 requires it.

---

## Feasibility Summary

| Aspect | Status | Note |
|---|---|---|
| React Router v7 + TanStack Query | ✅ OK | Providers already in place |
| Next 16 App Router + axios | ⚠️ Needs care | QueryProvider + token-store needed, feasible |
| Shadcn input/label | ⚠️ Needs verify | `components.json` config unconfirmed |
| BE API available | ✅ OK | `/auth/login`, `/auth/refresh`, `/auth/logout` verified |
| CORS for 2 FEs | ❌ Blocker | Only 1 origin allowed — B2 |
| Cookie cross-origin refresh | ❌ Blocker | `sameSite: strict` will block — B3 |
| Response shape assumption | ❌ Blocker | `ResponseInterceptor` wrapper ignored — B1 |

---

## Unresolved Questions

1. **Response unwrap strategy**: Unwrap at client layer vs read `.data.data` per call? Affects Phase 1 + 2.
2. **BE CORS**: Accept adding a separate Phase 0 to extend `origin` to array? Or out of scope?
3. **Cookie `sameSite`**: Change to `lax` in BE, or use dev proxy? What is the production strategy?
4. **Cookie `path: /api/v1/auth`**: Will this match the BE prefix in deployment? (e.g., if deployed behind reverse proxy without prefix strip)
5. **Next.js `/login` route group**: Create `app/(auth)/login/page.tsx` in Phase 2 or defer to Phase 3 refactor?
6. **Logout failure policy**: If logout API fails (network error), should local token still be cleared?
7. **Phase 0 for BE fixes**: Should a Phase 0 be added to fix CORS, `sameSite`, and response wrapper before FE coding starts?
8. **Unit tests**: Will `useLogin`, `tokenService`, `apiClient interceptor` have unit tests? Not in current plan.
