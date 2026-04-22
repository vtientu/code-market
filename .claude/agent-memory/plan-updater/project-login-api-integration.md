---
name: Login API Integration Plan — post-review state
description: Plan login page + API integration đã được update dựa trên review report; ghi nhớ các quyết định kiến trúc quan trọng
type: project
---

Plan: `plans/20260422-1500-login-page-api-integration/`
Review: `plans/reports/plan-review-260422-1000-login-api-integration.md`
Updated: 2026-04-22

**Key decisions made during update:**

- Response unwrap strategy: option (a) — unwrap tại client layer (`fetchClient` trả `body.data`, `apiClient` response interceptor trả `response.data.data`). Consumer đọc trực tiếp `LoginResponse`.
- Phase 0 (backend fixes) được thêm mới như pre-requisite bắt buộc trước Phase 1 & 2.
- Next.js login route dùng `app/(auth)/login/` route group thay vì `app/login/` để tránh bị AuthGate wrap.
- `useAuth.ts` bị loại khỏi Architecture (không có implementation step — YAGNI).
- File naming chuẩn hóa sang kebab-case trong CMS auth feature.

**Why:** Review phát hiện 5 blocker (response shape, CORS, cookie sameSite, tokenService URL, broken useUsers pattern) và 10 gap cần giải quyết trước khi implement.

**How to apply:** Nếu plan này được mở lại, các quyết định trên đã được document và không cần thảo luận lại.
