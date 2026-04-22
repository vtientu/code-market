# UI Test Report — CMS Frontend

- Date: 2026-04-22 11:15 (Asia/Saigon)
- Target: http://localhost:5173 (Vite dev server)
- Scope: Screenshots, Console errors, Accessibility

## Pages Loaded

| Route | Final URL | Title | Result |
|---|---|---|---|
| `/` | redirects → `/login` | cms_frontend | OK (200) |
| `/login` | `/login` | cms_frontend | OK (200) |

Root path redirects to `/login` (unauthenticated). Both pages rendered without runtime errors.

## Console Findings

### `/` (root)
- 1 ERROR: `Failed to load resource: 404` at `http://localhost:5173/undefined/auth/refresh`
  - Root cause: API base URL env var not resolved → string `"undefined"` interpolated into request URL.
  - Likely missing `VITE_API_BASE_URL` (or similar) in `cms_frontend/.env`.
  - File to inspect: `cms_frontend/src/lib/fetchClient.ts` and `cms_frontend/src/lib/tokenService.ts`.
- 1 verbose DOM warning: password input missing `autocomplete` attribute.

### `/login`
- No errors (refresh call appears to fire only on app boot at root).
- Same DOM autocomplete warning.

## Accessibility Audit (`/login`)

DOM checks:
- Heading: 1× `<h1>Đăng nhập` — OK (single H1).
- Inputs: `email`, `password` — both have associated `<label htmlFor>` — OK.
- Buttons: submit button has visible text "Đăng nhập" — OK. Devtools button has `aria-label` — OK.
- Images: none on page.

Issues:
1. `<input type="email">` missing `autocomplete="email"` (or `username`).
2. `<input type="password">` missing `autocomplete="current-password"` — also flagged by Chrome.
3. No `aria-label` on inputs (acceptable since labels are linked, but consider `aria-required` for required fields).
4. `lang` attribute on `<html>` should be `vi` (content is Vietnamese) — verify `index.html`.

ARIA snapshot returned empty (likely Puppeteer protocol limitation in this env); audit performed via DOM evaluation instead.

## Artifacts

- Screenshots:
  - `root.png` (full-page, redirects to login)
  - `login.png` (full-page)
- Console logs: `console-root.json`, `console-login.json`
- ARIA snapshot file: `aria-login.yaml` (empty)

All under: `D:\Workspace\code-market\plans\reports\ui-260422-1115-cms-frontend\`

## Recommendations (priority order)

1. **Fix `undefined/auth/refresh` 404** — set Vite env var (e.g. `VITE_API_BASE_URL`) and ensure `fetchClient.ts` reads it via `import.meta.env`.
2. Add `autocomplete="email"` and `autocomplete="current-password"` to login inputs.
3. Set `<html lang="vi">` in `index.html` to match content language.
4. Consider adding `aria-required="true"` to required inputs and a visible loading/error region with `role="alert"` for the login form.

## Unresolved Questions

- Is `/` intended to land on `/login` for unauthenticated users, or should it render a public landing page?
- Which env var name does `fetchClient.ts` expect for the API base URL? (Need to confirm to fix the 404.)
