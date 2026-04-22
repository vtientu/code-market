# Code Review: Auth Implementation (CMS + Frontend + Backend)

**Date:** 2026-04-22
**Base:** a7417ca (HEAD) vs working tree
**Scope:** cms_frontend (Vite/React), frontend (Next.js App Router), backend (NestJS)

---

## Summary

Auth works end-to-end but has several correctness bugs, a CSRF exposure gap, redirect-loop/UX defects on the Next frontend, and significant logic duplication between the two frontends with behavioral drift. Memory-only token storage is intentional (good) but hinges on refresh-cookie availability across reload, which is fragile if CORS/cookie attrs are misconfigured.

---

## Critical

### C1. Next frontend: wrong-credentials 401 nukes the login page
**File:** `frontend/lib/apiClient.ts:62-89`
**Problem:** Response interceptor treats *any* 401 (including from `POST /auth/login` with bad credentials) as an expired-access-token event. It calls `/auth/refresh`, which returns 401 (no valid refresh cookie), and then `window.location.href = "/login"` executes — discarding the login form's error state.
**Why it matters:** User enters wrong password → page reloads to `/login` with no feedback. Looks broken.
**Fix:** Skip refresh logic for auth endpoints:
```ts
const url = originalRequest.url ?? "";
if (url.includes("/auth/login") || url.includes("/auth/refresh") || url.includes("/auth/register")) {
  return Promise.reject(error);
}
```
The same issue exists on cms (`fetchClient.ts:55`) — login failure triggers refresh → forces hard redirect to `/login`.

### C2. CMS fetchClient: wrong-credentials 401 also triggers refresh → hard redirect
**File:** `cms_frontend/src/lib/fetchClient.ts:55-65`
**Problem:** Same as C1. Login mutation's 401 response cascades into `tokenService.refresh()` → `window.location.href = "/login"`, losing React state.
**Fix:** Exclude auth endpoints from the 401-refresh branch (check `endpoint` prefix).

### C3. CSRF: `sameSite: 'none'` in prod + no CSRF token
**File:** `backend/src/auth/auth.controller.ts:26`
**Problem:** Refresh cookie in prod uses `sameSite: 'none'`, which means any origin can trigger a credentialed POST to `/api/v1/auth/refresh`. The only line of defense is CORS allow-list + the implicit preflight on JSON content-type / custom headers. The Next frontend's `apiClient` sends JSON (`Content-Type: application/json`) which forces preflight, so CORS blocks unknown origins — OK. But: cms's `X-Requested-With` header is set, Next's apiClient is *not*. If anyone ever relaxes CORS, you have no secondary defense.
**Why it matters:** Single line of defense (CORS) for a rotating refresh token. A misconfigured `FRONTEND_URL` env (e.g. wildcard or accidental `null`) silently opens CSRF.
**Fix:** Either add an explicit CSRF token (double-submit cookie) or enforce a custom header (e.g. `X-Requested-With`) in a guard. Also validate `FRONTEND_URL` / `CMS_URL` are exact HTTPS origins (no wildcards) at boot.

---

## Important

### I1. Next frontend: auth only gates `app/page.tsx`, not other routes
**File:** `frontend/app/page.tsx:6-8, 67`
**Problem:** `<AuthGate>` wraps only the Home page. Every future route under `app/` will be unprotected unless each page adds the gate manually. YAGNI-friendly today, but a footgun.
**Fix:** Create `app/(protected)/layout.tsx` that wraps with `<AuthGate>`, move protected pages into the group. Or use Next middleware for a coarser redirect before hydration.

### I2. Next frontend: AuthGate reads mutable `tokenStore.get()` during render without subscribing
**File:** `frontend/components/auth-gate.tsx:11`
**Problem:** `hasToken` is read synchronously at render. It updates only because `ready` toggles and causes a re-render. If a token is set outside a bootstrap flow (e.g. a future background refresh), UI won't re-render. Also, the in-memory store is a module singleton — no reactivity. A login in another tab will not update this tab.
**Fix:** Either (a) wrap tokenStore in a Zustand/Redux store with subscriptions, or (b) track the token in a React context/state. Current design is fragile but works for the single-tab happy path.

### I3. CMS login ignores intended destination
**File:** `cms_frontend/src/features/auth/hooks/use-login.ts:14`
**Problem:** `ProtectedRoute` captures `location.state.from` on redirect to `/login`, but `useLogin.onSuccess` always calls `navigate("/")`, discarding it.
**Fix:**
```ts
const location = useLocation();
const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
navigate(from, { replace: true });
```

### I4. Next frontend: useLogin doesn't hydrate query cache or invalidate
**File:** `frontend/features/auth/use-login.ts`
**Problem:** No `queryClient.setQueryData` for current user, no `invalidateQueries`. CMS version calls `setQueryData(authKeys.me(), data.user)`. Behavioral drift.
**Fix:** Mirror the cms pattern or document why it's omitted. `queryClient.clear()` should also be called on logout (no logout mutation exists yet in Next frontend — see I7).

### I5. Massive DRY violation between `cms_frontend` and `frontend`
**Files:**
- Auth API: `cms_frontend/src/features/auth/api/auth-api.ts` vs `frontend/features/auth/auth-api.ts`
- Types: `auth.types.ts` vs `auth-types.ts` (one adds zod, one doesn't)
- Token store: `tokenService.ts` vs `token-store.ts` (near-identical, different API surface)
- Login form: two copies, ~90% identical markup + validation logic
- Bootstrap hook: near-identical, different HTTP client
- File naming: cms uses camelCase + folders (`api/`, `hooks/`, `keys/`, `types/`), frontend uses kebab-case flat layout

**Why it matters:** Divergent behavior (cms has `use-logout`, Next has none; cms uses regex email check, Next uses zod; cms captures `from` in ProtectedRoute, Next uses simpler gate). Bug fixes must be applied twice and will drift.

**Fix:** Extract a shared `packages/auth-shared` (or `libs/auth/`) workspace with types, validation schema (zod), key conventions, and framework-agnostic auth state. Keep framework-specific glue (fetchClient/apiClient/route guards) per app. If monorepo tooling is unavailable, at minimum copy types from a single source (e.g. generate from backend DTOs via openapi-typescript).

### I6. Next frontend is missing a logout flow
**File:** `frontend/features/auth/` (no use-logout.ts)
**Problem:** CMS has `use-logout.ts` that clears token + query cache + navigates. Next frontend has nothing — a user cannot sign out, and the refresh cookie stays valid for 7 days.
**Fix:** Port `use-logout.ts` from cms.

### I7. Login redirect effect uses stale token read
**File:** `frontend/app/(auth)/login/login-form.tsx:17-19`
**Problem:**
```ts
useEffect(() => {
  if (tokenStore.get()) router.replace("/");
}, [router]);
```
Runs once on mount. Since tokenStore is memory-only and cleared on every page load, this branch is unreachable on fresh navigation. If a user lands on `/login` via SPA nav after already having logged in, it works — but that state is also handled by AuthGate not wrapping login. Dead code leading to confusion.
**Fix:** Remove the effect, or tie it to the bootstrap result (wait for refresh attempt, then redirect if token exists).

### I8. Race: `tokenStore` not reactive but AuthGate rerenders by coincidence
**File:** `frontend/components/auth-gate.tsx:11-15`
**Problem:** After bootstrap sets token, `useBootstrapAuth` calls `setReady(true)`, which re-renders AuthGate, and `tokenStore.get()` picks up the new value. If bootstrap's order were reversed (setReady before setting token, or an early return after set), AuthGate would render before the token is written. Currently safe, but coupling is implicit.
**Fix:** Return `{ ready, hasToken }` from `useBootstrapAuth` with `hasToken` as state, or move to a reactive store (see I2).

### I9. Backend CORS allow-list: fallback defaults leak into prod if env is set but falsy
**File:** `backend/src/main.ts:24-30`
**Problem:** Guard only throws when `isProd` AND either URL is missing. But `CMS_URL=''` (empty string) would pass the `!cmsUrl` truthiness check only if empty string is falsy (it is), OK — but `CMS_URL='http://evil'` would silently be accepted. No format validation.
**Fix:** Validate URLs via `new URL()` and enforce `https:` in prod. Log the final origin list on boot.

### I10. Response envelope unwrap is destructive and unchecked
**File:** `frontend/lib/apiClient.ts:51-57`, `cms_frontend/src/lib/fetchClient.ts:77-78`
**Problem:**
- Next: unconditional `response.data = body.data` if `'data' in body`. If a real API ever returns `{ data: ... }` without being an envelope (e.g. nested `data` field from a relay-style response), it gets unwrapped incorrectly.
- CMS: `const json = await response.json() as { data: T }; return json.data;` — if backend ever returns a non-enveloped 200, silently returns `undefined` typed as `T`.
**Fix:** Check `body.success` and `body.statusCode` before unwrapping, or switch on a sentinel header set by `ResponseInterceptor`.

### I11. `IUsersParams` index signature weakens type safety
**File:** `cms_frontend/src/features/users/types/user.types.ts:9`
**Problem:** `[key: string]: string | number | boolean | undefined;` allows arbitrary keys; typos now compile. Added purely to satisfy `fetchClient.get<IUser[]>("/users", { params })` signature.
**Fix:** Either (a) make `RequestOptions.params` accept `Record<string, ...>` directly without requiring the index signature on typed param interfaces, or (b) pass params inline, not typed.

### I12. Logout requires a valid access token — dead-token users can't cleanly log out
**File:** `backend/src/auth/auth.controller.ts:67-79`
**Problem:** `JwtAuthGuard` protects `/auth/logout`. If the access token is expired, logout triggers a refresh (via 401 interceptor), retries, succeeds — works but wastes a round-trip. If refresh cookie is also dead, logout never runs and the user is redirected to `/login` without the server revoking the refresh token (the cookie is already expired though, so mostly OK).
**Fix:** Either use `JwtRefreshGuard` on logout (use the refresh cookie), or an unauthenticated logout that simply clears the cookie. Also clear on login endpoints for hygiene.

---

## Minor

### M1. `frontend/features/auth/auth-api.ts` logout returns raw `AxiosResponse`
`apiClient.post("/auth/logout")` is not `.then((r) => r.data)` like login. Inconsistent shape.

### M2. CMS `refreshPromise` deduplication is good but leaks on sync throw
**File:** `cms_frontend/src/lib/tokenService.ts:26-41`
If `fetch()` itself throws synchronously before the promise resolves, `refreshPromise = null` in `finally` still runs — OK actually. No bug, but note the promise resolves to `false` on error, not rejecting, so callers can't distinguish network error from 401. Fine for current callers.

### M3. Next `login-form.tsx` duplicates `useState` import
**File:** `frontend/app/(auth)/login/login-form.tsx:3, 8`
Two separate imports from `react`. Consolidate.

### M4. CMS `authKeys.me()` is never queried
**File:** `cms_frontend/src/features/auth/hooks/use-login.ts:13`, `cms_frontend/src/features/auth/keys/auth-keys.ts`
`setQueryData(authKeys.me(), data.user)` is written but no `useQuery(authKeys.me())` exists. Dead write until a `useCurrentUser` hook lands.

### M5. `cms_frontend/src/pages/Login.tsx` duplicates the bootstrap loader UI used in `ProtectedRoute`
Extract a `<FullScreenLoader>` component.

### M6. `cms_frontend/src/features/auth/index.ts` re-exports aren't consumed consistently
Some files import from `@/features/auth`, others go deeper (e.g. `@/features/auth/components/login-form`). Pick one convention.

### M7. `fetchClient.refresh` redirect forces hard navigation
**File:** `cms_frontend/src/lib/fetchClient.ts:63`
`window.location.href = "/login"` loses all React state and triggers a full page load. Use `react-router`'s `useNavigate` — but that requires the client to live outside module scope. Acceptable current trade-off; flag for future refactor.

### M8. Backend auth controller mixes boot-time env read with runtime cookie opts
**File:** `backend/src/auth/auth.controller.ts:19`
`isProd` evaluated at module load. If tests mutate `NODE_ENV`, opts are stale. Minor.

### M9. `backend/src/main.ts` swallows origin misconfig at boot for non-prod
Localhost fallbacks are fine, but a dev hitting prod env without `NODE_ENV=production` gets localhost origins silently — confusing. Log effective origin list.

### M10. Hard-coded Vietnamese strings with no i18n plumbing
Consistent with existing code. Flag for later if multi-locale is planned.

---

## Nit

- **N1.** `cms_frontend/src/features/auth/components/login-form.tsx:7-18`: hand-rolled email regex; use `z.email()` like the Next side does (unifies validation).
- **N2.** `frontend/lib/query-client.tsx:9`: `retry: 1` on queries may mask real failures during auth bootstrap. Consider `retry: (count, err) => err.status !== 401 && count < 1`.
- **N3.** `frontend/app/page.tsx:5-11`: JSX indentation regressed — the outer `<AuthGate>` is flush-left while inner `<div>` remains at original indent.
- **N4.** `cms_frontend/src/lib/fetchClient.ts:10`: throwing at module load is fine for dev, but crashes the entire Vite HMR bundle on env rename. Acceptable.
- **N5.** `cms_frontend/src/features/users/hooks/useUsers.ts`: file name still camelCase; project rule prefers kebab-case (`use-users.ts`). New files in `features/auth/` already follow kebab-case — existing `useUsers.ts` is legacy.
- **N6.** Mixed quote style across new files (single vs double). Not enforced by lint, but jarring.

---

## Positive

- Refresh-token dedupe via shared promise in `cms tokenService.refresh` (correct implementation).
- Memory-only access token (no localStorage) — good XSS posture.
- Httponly + secure + sameSite cookies are set correctly per env.
- `ResponseInterceptor` envelope is consistent and both clients unwrap it.
- `JwtRefreshGuard` on `/auth/refresh` — proper separation from access-token auth.
- Zod schema on Next side is a good foundation (extract to shared package).
- Refresh cookie path scoped to `/api/v1/auth` limits exposure.
- `ProtectedRoute` captures `location.state.from` (even if currently unused).

---

## Recommended Actions (priority order)

1. **Fix C1/C2** — exclude auth endpoints from 401 refresh branch in both `apiClient.ts` and `fetchClient.ts`. One-line check, prevents nuking login UX.
2. **Fix C3** — add URL format validation for CORS origins; document that `sameSite: 'none'` requires an allow-listed origin *and* enforce a custom-header CSRF shield (`X-Requested-With` guard).
3. **Fix I3** — honor `location.state.from` in cms login.
4. **Fix I6** — port `use-logout.ts` to Next frontend.
5. **Refactor I5** — extract shared auth types/validation to a common module (at minimum, duplicate the zod schema into cms and delete the ad-hoc regex validator).
6. **Fix I1** — introduce `app/(protected)/layout.tsx` in Next.
7. **Fix I10** — check envelope shape before unwrapping.
8. **Clean up M1, M3, I7** — small code hygiene wins.

---

## Metrics

- Files reviewed: 24 (13 modified, 11 new)
- New LOC (approx): ~520
- All new files < 200 LOC ✓
- Type coverage: no explicit `any`, but `BackendEnvelope` and `RequestOptions.params` rely on soft typing (I11)
- Tests: none added for auth — **test coverage of new auth surface: 0%**

---

## Unresolved Questions

1. Is `cms_frontend` expected to stay separate long-term, or is the intent to converge into Next frontend only? Answer affects whether I5 (shared package) is worth the lift.
2. Why does refresh cookie path scope to `/api/v1/auth` but CORS + credentials allow the cookie to be sent on other auth paths? Intentional, or should logout also accept refresh cookie auth (I12)?
3. No logout endpoint on the Next frontend — is this planned for a later phase or an oversight?
4. Is CSRF mitigation expected at the app layer (custom header) or infra layer (CloudFront/WAF header injection)? Determines whether C3's fix is code-side or ops-side.
5. Role-based gating: `AuthUser.role` exists (`BUYER | SELLER | ADMIN`) but no route/component checks it anywhere. When will role-based access control land?
6. Does backend's `ResponseInterceptor` wrap error responses too? If yes, `HttpError` message extraction in `fetchClient.ts:68-72` may pull the wrong field.
