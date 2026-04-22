# Code Review — Working Tree Changes

- Date: 2026-04-22 11:15 (Asia/Saigon)
- Scope: 12 modified files + new auth modules (cms_frontend + frontend) + new ui primitives
- Reviewer style: brutal, evidence-based

## Verdict

**DO NOT MERGE.** 4 critical bugs, 6 important issues, several minor. The auth refactor is on the right track but has correctness issues that will manifest the moment you exit happy-path dev.

---

## CRITICAL (must fix before commit)

### C1. `cms_frontend/src/lib/fetchClient.ts:81-82` — `get` is broken for callers
```ts
get: <T>(endpoint: string, options: RequestOptions) => ...
```
`options` is **required** here while `post/patch/put/delete` accept it optionally. Every existing call site that does `fetchClient.get("/foo")` with no options now fails type-check. Fix: `options?: RequestOptions = {}` (or destructure with default).

### C2. `cms_frontend/src/lib/tokenService.ts` — env var not guarded → produces the literal `undefined/auth/refresh` 404 we observed in the UI test
```ts
`${import.meta.env.VITE_API_URL}/auth/refresh`
```
If `VITE_API_URL` is unset, JS interpolates `undefined`. The console error from the UI run is exactly this. Add a fail-fast at module load (`if (!import.meta.env.VITE_API_URL) throw ...`) or a build-time `define` enforcement. This also affects `fetchClient.ts:9` (`BASE_URL`).

### C3. `cms_frontend/src/features/users/hooks/useUsers.ts` — stub returns nothing real
```ts
queryFn: () => Promise.resolve([]),
enabled: false,
```
This silently returns empty data forever. Either wire `userApi.list(params)` or delete the hook. Shipping this hides regressions: any users page will render empty with zero failures.

### C4. `cms_frontend/src/lib/fetchClient.ts:76-77` AND `frontend/lib/apiClient.ts:38-44` — auto-unwrap is fragile and recursive-prone
```ts
return (json.data !== undefined ? json.data : json) as T;
// and:
if (response.data?.data !== undefined) response.data = response.data.data;
```
Heuristic unwrapping breaks the moment BE returns a legitimate payload whose top-level shape contains a `data` field (e.g. paginated `{data: [...], meta: {...}}`). You'll either:
- Lose `meta` (CMS) silently, or
- Double-unwrap if the inner payload itself has `.data`.

Make it explicit: BE envelope is `{success, statusCode, message, data}` — always unwrap unconditionally, type the envelope, and surface `success/message` for error handling. Or stop wrapping on BE.

---

## IMPORTANT (fix before next round)

### I1. `backend/src/auth/auth.controller.ts:22` — `sameSite: 'lax'` will break refresh in production cross-site
Going from `strict` → `lax` makes dev work (CMS@5173 → API@3000 are same-site since ports don't matter for SameSite). In prod, if CMS/Web and API live on **different registrable domains**, `lax` blocks the refresh cookie on XHR. You need `sameSite: 'none' + secure: true` for true cross-site BFF — or document that all surfaces must share a registrable domain (e.g. `*.example.com`).

### I2. `cms_frontend/src/lib/fetchClient.ts:51` — `credentials: "same-origin"` contradicts `tokenService.refresh` (`include`)
If API is on a different origin, regular requests won't carry cookies (e.g. CSRF) but refresh does. Pick one policy. For BFF + Bearer-in-header you want either `omit` everywhere except refresh, or `include` everywhere. Right now it's mixed.

### I3. `frontend/lib/apiClient.ts:48,57` — `_retry` is a stringly-typed pseudo-property on Axios config
TypeScript won't catch typos. Add a module augmentation:
```ts
declare module "axios" { interface InternalAxiosRequestConfig { _retry?: boolean } }
```

### I4. `cms_frontend/src/pages/Login.tsx:6-8` — synchronous redirect skips bootstrap
On hard reload of `/login` for a returning user, in-memory `accessToken` is empty → form renders. `ProtectedRoute` only bootstraps on protected routes, so `/login` never refreshes. A logged-in user typing `/login` sees the form. Either also bootstrap inside `Login`, or accept the UX (document it).

### I5. Two parallel auth implementations (`cms_frontend/.../features/auth` and `frontend/features/auth`) drift already
- `LoginRequest` vs `LoginInput` (one Zod, one hand-rolled regex)
- `AuthUser.role`: `"BUYER"|"SELLER"|"ADMIN"` literal vs `string`
- Field-error wiring is duplicated.

If these surfaces will continue to diverge intentionally — fine. Otherwise extract a shared package (or at minimum, share `auth-types`). Right now you'll bug-fix in one and forget the other.

### I6. `cms_frontend/.../features/auth/index.ts` barrel re-exports everything
Hooks, components, api, keys, types all re-exported. Risk: any internal file that imports `@/features/auth` (instead of specific paths) will trigger circular deps as the module grows. Either keep the barrel and lint against internal usage of it, or drop it.

---

## MINOR

- **M1.** `useBootstrapAuth` (both apps): doesn't seed `authKeys.me()` after refresh. Forces a follow-up fetch. Cheap to seed if `/auth/refresh` returns the user, otherwise fine.
- **M2.** `frontend/components/auth-gate.tsx:27` — returns `null` between `ready=true` and the effect-scheduled `router.replace("/login")`. Visible blank flash. Replace with a redirect guard inside the same render.
- **M3.** `cms_frontend/src/features/auth/components/login-form.tsx` — uses regex email validation; the Next.js side uses Zod. Pick one. Also missing `autocomplete="email"` / `autocomplete="current-password"` (also flagged in the prior UI test report).
- **M4.** `cms_frontend/src/router/index.tsx` — `<ProtectedRoute />` is rendered at the layout level, which means **every** protected route triggers `useBootstrapAuth`. That's correct, but means a Suspense fallback during lazy-load races with the "Đang tải..." screen. Fine for now.
- **M5.** `backend/src/main.ts` — origin array is fine, but no production guard. If both env vars are unset in prod, you'll happily allow `localhost:5173` and `localhost:3001`. Add a prod check.
- **M6.** `useLogout` calls `clearSession` on both `onSuccess` and `onError`. Correct behavior, but a comment would help future readers understand the intent ("always clear, even if BE logout fails").
- **M7.** `frontend/lib/query-client.tsx:7` exports `QueryProvider` but `app/providers.tsx` re-wraps it as `Providers`. The wrapper is currently a no-op pass-through — drop one layer.

---

## What's good

- Single-flight refresh in `tokenService.refresh` with `refreshPromise` cleanup in `finally` — correct and avoids the classic 401 storm.
- `ProtectedRoute` + `useBootstrapAuth` separation is clean.
- Moving access token to in-memory store (both apps) is the right call.
- CORS now correctly allows credentials for the CMS origin.

---

## Verification commands run

- `git diff --stat HEAD` — confirmed scope (12 modified, 11 untracked groups)
- Read full diffs for all 9 changed code files + 14 new auth/ui files
- Cross-checked against UI-test report findings (the `undefined/auth/refresh` console error matches C2 directly)

## Unresolved questions

1. What's the actual value of `VITE_API_URL` expected to be — `http://localhost:3000/api/v1` or `http://localhost:3000`? The cookie path `/api/v1/auth` only matches if the refresh URL also includes `/api/v1/auth/...`.
2. Is the BE response envelope `{success, statusCode, message, data}` **always** present? If yes, drop the `if (data?.data !== undefined)` heuristic and unwrap unconditionally.
3. Are CMS and Web intended to live on the same registrable domain in prod (so `sameSite: 'lax'` survives)?
4. Is `useUserList` a deliberate stub (TODO marker?) or forgotten work-in-progress?
