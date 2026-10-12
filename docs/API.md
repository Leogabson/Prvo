# Prvo API Documentation

Base URL:
- Production: `https://api.prvo.app`
- Development: `http://localhost:4000`

All endpoints return JSON responses. Errors use standard HTTP status codes and structured error payloads.

---

## 1. Operational Endpoints

### `GET /health`
Liveness probe. Excluded from rate limiting.

- **Response:** `200 OK`
```json
{
  "status": "ok",
  "service": "Prvo",
  "timestamp": "2026-10-12T12:00:00.000Z"
}
```

### `GET /ready`
Readiness probe checking database connectivity (`SELECT 1`). Excluded from rate limiting.

- **Response:** `200 OK`
```json
{
  "status": "ready",
  "service": "Prvo",
  "database": "connected"
}
```
- **Error:** `503 Service Unavailable` if database is unreachable.

---

## 2. Authentication Endpoints

### `POST /auth/register`
Creates a new user account with email and password.
- **Rate Limit:** 5 requests / hour per IP.
- **Request Body:**
```json
{
  "email": "founder@example.com",
  "password": "MinTenCharactersPassword!",
  "name": "Jane Founder"
}
```
- **Response:** `201 Created`
  - Sets httpOnly `prvo_refresh_token` cookie (30-day lifetime, Path `/auth`, SameSite=Strict).
```json
{
  "user": {
    "id": "uuid-v4",
    "email": "founder@example.com",
    "name": "Jane Founder",
    "role": "user",
    "plan": "free"
  },
  "accessToken": "jwt-token-string"
}
```
- **Errors:**
  - `400 Bad Request`: Validation failure (password < 10 chars, common password).
  - `409 Conflict`: Email already registered (`EMAIL_EXISTS`).

---

### `POST /auth/login`
Authenticates with email and password.
- **Rate Limit:** 10 requests / 15 minutes per IP.
- **Request Body:**
```json
{
  "email": "founder@example.com",
  "password": "MinTenCharactersPassword!"
}
```
- **Response:** `200 OK`
  - Sets httpOnly `prvo_refresh_token` cookie.
```json
{
  "user": {
    "id": "uuid-v4",
    "email": "founder@example.com",
    "name": "Jane Founder",
    "role": "user",
    "plan": "free"
  },
  "accessToken": "jwt-token-string"
}
```
- **Error:** `401 Unauthorized` with generic message `"Invalid email or password"`.

---

### `POST /auth/refresh`
Rotates refresh token and issues a new access token. Requires valid `Origin` header.
- **Headers:** `Origin: https://prvo.app`
- **Cookies:** `prvo_refresh_token`
- **Response:** `200 OK`
  - Sets rotated httpOnly `prvo_refresh_token` cookie.
```json
{
  "accessToken": "new-jwt-token-string"
}
```
- **Errors:**
  - `403 Forbidden`: Origin header not in allow-list.
  - `401 Unauthorized`: Missing or invalid token. If a previously-used token is replayed, the entire token family is revoked.

---

### `POST /auth/logout`
Revokes current refresh token and clears cookie. Requires valid `Origin` header.
- **Headers:** `Origin: https://prvo.app`
- **Cookies:** `prvo_refresh_token`
- **Response:** `200 OK`
  - Clears `prvo_refresh_token` cookie.
```json
{
  "message": "Logged out successfully"
}
```

---

### `POST /auth/forgot-password`
Generates a 1-hour single-use reset token and dispatches email.
- **Rate Limit:** 5 requests / hour per IP.
- **Request Body:**
```json
{
  "email": "founder@example.com"
}
```
- **Response:** `200 OK` (generic response regardless of whether email exists to prevent user enumeration):
```json
{
  "message": "If this email is registered, password reset instructions have been sent."
}
```

---

### `POST /auth/reset-password`
Resets password using single-use reset token. Revokes all active refresh tokens for the user.
- **Request Body:**
```json
{
  "token": "raw-reset-token",
  "password": "NewSecretPassword123!"
}
```
- **Response:** `200 OK`
```json
{
  "message": "Password reset successfully. You can now log in with your new password."
}
```
- **Errors:**
  - `400 Bad Request`: Invalid or expired reset token.

---

### `GET /auth/google` & `GET /auth/google/callback`
Google OAuth authorization code flow with PKCE and state verification.
- Route is cleanly disabled when `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` are unset.
- Exchanges authorization code for verified email.
- Redirects user to `/dashboard` with httpOnly refresh token set upon successful login.

---

## 3. Current User (`/me`)

### `GET /me`
Returns current user profile and plan usage.
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid-v4",
    "email": "founder@example.com",
    "name": "Jane Founder",
    "avatarUrl": null,
    "role": "user",
    "plan": "free"
  },
  "usage": {
    "activeIdeas": 1,
    "limit": 3
  }
}
```

### `PATCH /me`
Updates user profile.
- **Headers:** `Authorization: Bearer <accessToken>`
- **Request Body:**
```json
{
  "name": "Jane Doe",
  "avatar_url": "https://example.com/avatar.png"
}
```
- **Response:** `200 OK` with updated user object.

---

## 4. Ideas Endpoints

All ideas endpoints require `Authorization: Bearer <accessToken>`.
Access control is strictly enforced: users can only view or mutate their own ideas. Accessing another user's idea returns `404 Not Found`.

### `POST /ideas`
Creates a new startup idea and its version 1.
- **Plan Enforcement:** Enforces `plan_limits.active_ideas` (limit: 3 on free plan). If count of active/draft ideas >= 3, returns `403 Forbidden` with `PLAN_LIMIT_REACHED`.
- **Request Body:**
```json
{
  "title": "B2B AI Validation Engine",
  "problem": "Founders spend months writing code without evidence that customers need it.",
  "target_customer": "Early-stage bootstrap founders and venture builders",
  "solution": "Automated market research and evidence synthesis with customer signals.",
  "business_model": "subscription",
  "business_model_note": "Tiered monthly pricing",
  "stage": "idea_only",
  "industry": "b2b_saas",
  "region": "Worldwide",
  "status": "active"
}
```
- **Response:** `201 Created`
```json
{
  "idea": {
    "id": "uuid-v4",
    "userId": "uuid-v4",
    "title": "B2B AI Validation Engine",
    "status": "active",
    "currentVersionId": "uuid-v4",
    "createdAt": "2026-10-12T12:00:00.000Z",
    "updatedAt": "2026-10-12T12:00:00.000Z"
  },
  "version": {
    "id": "uuid-v4",
    "versionNumber": 1,
    "title": "B2B AI Validation Engine",
    "problem": "...",
    "solution": "...",
    "stage": "idea_only",
    "businessModel": "subscription",
    "industry": "b2b_saas",
    "region": "Worldwide"
  }
}
```

---

### `GET /ideas`
Lists user's ideas, newest first, excluding soft-deleted ideas.
- **Query Parameters:** `?status=all|active|draft|archived` (default: `all`)
- **Response:** `200 OK`
```json
{
  "ideas": [
    {
      "id": "uuid-v4",
      "title": "B2B AI Validation Engine",
      "status": "active",
      "createdAt": "2026-10-12T12:00:00.000Z",
      "currentVersion": {
        "versionNumber": 1,
        "stage": "idea_only",
        "problem": "..."
      }
    }
  ]
}
```

---

### `GET /ideas/:id`
Retrieves single idea with current active version.
- **Response:** `200 OK`
```json
{
  "idea": { "id": "uuid-v4", "title": "...", "status": "active" },
  "currentVersion": { "id": "uuid-v4", "versionNumber": 1, "..." : "..." }
}
```
- **Error:** `404 Not Found` if idea does not exist or belongs to another user.

---

### `PATCH /ideas/:id`
Updates an idea by creating a new version (`versionNumber + 1`) and updating `current_version_id`.
- **Request Body:** Partial or full idea fields.
- **Response:** `200 OK`
```json
{
  "idea": { "id": "uuid-v4", "currentVersionId": "version-2-uuid" },
  "version": { "id": "version-2-uuid", "versionNumber": 2, "...": "..." }
}
```

---

### `POST /ideas/:id/archive`
Archives an active or draft idea (`status = 'archived'`), freeing up a slot toward the plan limit.
- **Response:** `200 OK`

---

### `POST /ideas/:id/restore`
Restores an archived idea (`status = 'active'`).
- **Plan Enforcement:** Checks if restoring would exceed active ideas limit.
- **Response:** `200 OK`
- **Error:** `403 Forbidden` (`PLAN_LIMIT_REACHED`) if limit is reached.

---

### `DELETE /ideas/:id`
Soft-deletes the idea (`deleted_at = NOW()`), freeing up a slot toward the plan limit.
- **Response:** `200 OK`

---

### `GET /ideas/:id/versions`
Lists all historical immutable versions of an idea, ordered newest version first.
- **Response:** `200 OK`
```json
{
  "versions": [
    { "versionNumber": 2, "title": "...", "createdAt": "..." },
    { "versionNumber": 1, "title": "...", "createdAt": "..." }
  ]
}
```
