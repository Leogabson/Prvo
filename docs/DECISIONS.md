# Architectural & Technical Decisions: Prvo Foundation (Prompt 1)

This document records the architectural decisions, defaults, and assumptions made during the foundation setup of Prvo.

## 1. Monorepo Architecture & Workspace Layout
- **Decision:** Use pnpm workspaces with three main directories:
  - `apps/web`: Next.js (App Router) frontend application.
  - `apps/api`: Express backend application.
  - `packages/shared`: Shared TypeScript package containing brand constants, environment schemas, and shared error interfaces.
- **Rationale:** Strict separation of frontend and backend concerns with compile-time type sharing for brand definitions, error contracts, and environment configurations without unnecessary code duplication.

## 2. Brand & Domain Single Source of Truth (`brand.ts`)
- **Decision:** All brand names ("Prvo"), taglines ("Proof before you build."), domains (`prvo.app`), origins (`api.prvo.app`, `go.prvo.app`), and support emails are strictly centralized in `packages/shared/src/brand.ts`.
- **Default Resolution:** Hostnames and origins resolve dynamically from validated environment variables (`APP_URL`, `API_URL`, `LANDING_URL`) and fall back to brand defaults. Hard-coding strings across `apps/web` or `apps/api` is strictly disallowed.
- **Subdomains:**
  - Web App: `https://prvo.app`
  - API: `https://api.prvo.app`
  - Public Surveys: `https://prvo.app/s/{slug}`
  - Landing-page tests: `https://go.prvo.app/{slug}` (isolated origin to prevent user-generated content from accessing app cookies).

## 3. Environment Validation Strategy
- **Decision:** Validated via Zod with a `validateEnv` helper executing at application bootstrap (`server.ts` and `apps/web`). If validation fails, process logs structured missing variable diagnostics and halts immediately with exit code 1.
- **Staging vs. Production Rules:**
  - Variables required in all environments: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `APP_URL`, `API_URL`, `LANDING_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
  - Variables optional in development/test but mandatory when `NODE_ENV === 'production'`: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_MODEL_FAST`, `TAVILY_API_KEY`, `BRAVE_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## 4. Database & Drizzle Configuration
- **Decision:** Neon serverless PostgreSQL using Drizzle ORM (`drizzle-orm` + `postgres` driver / `@neondatabase/serverless`).
  - Runtime queries use `DATABASE_URL` (pooled connection).
  - Schema migrations use `DATABASE_URL_UNPOOLED` (direct, unpooled connection).
- **Initial Schema:** Only one smoke-test table: `_migrations_check` with columns `id`, `name`, and `applied_at` to verify migration application. No product tables are introduced in this foundation phase.
- **Migration Engine:** SQL files generated into `apps/api/drizzle` and executed via `drizzle-orm/postgres-js/migrator` or `drizzle-kit migrate`.

## 5. API Resilience & Operational Endpoints
- **Decision:** Express configured with:
  - `helmet`: Secure HTTP response headers.
  - `cors`: Restricted origin allow-list dynamically constructed from `APP_URL` and `LANDING_URL`.
  - `crypto.randomUUID()` request-ID middleware setting `x-request-id` header and attached to logger.
  - `pino` structured JSON logging (`pino-http`).
  - `express-rate-limit`: Global rate limiting window of 15 minutes, 100 requests per IP default.
  - `GET /health`: Liveness probe (process is running, returns 200).
  - `GET /ready`: Readiness probe (verifies database connectivity using `SELECT 1`; returns 200 if reachable, 503 if unreachable).
  - Graceful shutdown handlers for `SIGTERM` and `SIGINT` draining open HTTP sockets and database pools.

## 6. Design System Tokens & Typography
- **Decision:** Tailwind CSS configured with custom CSS variables for light and dark modes:
  - Colors:
    - Primary Accent: Vermilion (`#C93B17` light, `#E5502B` dark, WCAG AA compliant on paper/white text).
    - Ink: `#16140F` (text in light, background in dark).
    - Paper: `#FBF8F1` (background in light, text in dark).
    - Stone: `#E8E2D4` (borders and card surfaces; adjusted for dark mode `#26231D`).
    - Verdigris: `#1F5C4D` (secondary links, focus rings; adjusted for dark mode `#348B77`).
  - Verdict Colors:
    - Brick: `#7C2616` (0-39 score).
    - Ochre: `#9A6A12` (40-59 score).
    - Moss: `#4F7A3A` (60-79 score).
    - Verdigris: `#1F5C4D` (80-100 score).
  - Style: Radius 6px, 1px stone borders, flat surfaces, zero gradients/sparkles/AI glows.
  - Fonts loaded via `next/font/google`: Fraunces (serif headings), Instrument Sans (body & UI), IBM Plex Mono (scores & data).
- **Showcase:** `/design` page in `apps/web` with light/dark preview, token swatches, typography scale, buttons, inputs, cards, and verdict badges with icon + label.

## 7. AI Provider Architecture
- **Decision:** AI provider: Google Gemini behind an LLMService interface; model names come from env.
- **Model Defaults & Single Source of Truth:** Defined centrally in `packages/shared/src/ai-config.ts`:
  - Default model: `gemini-3.5-flash` (`GEMINI_MODEL`)
  - Fast model: `gemini-3.1-flash-lite` (`GEMINI_MODEL_FAST`)
- **Retirement Deprecation Guard:** Startup warning emitted if any model name starts with `gemini-2.5`, noting that Gemini 2.5 models retire on 16 October 2026.

## 8. Foundation Cleanup & Hardening (Prompt 1D)
- **Strict Database URL Isolation:**
  - The API runtime uses `DATABASE_URL` (pooled connection).
  - The migration runner uses `DATABASE_URL_UNPOOLED` ONLY.
  - Removed all pooled/unpooled fallback preprocess logic from `apiEnvSchema`. The migration runner fails with a clear descriptive error if `DATABASE_URL_UNPOOLED` is missing and never falls back to `DATABASE_URL` in any environment.
  - Removed redundant `DATABASE_URL_POOLED` variable everywhere.
  - Retained harmless quote-stripping sanitization across all database URLs.
- **Probe Rate Limiting Bypass:**
  - `GET /health` and `GET /ready` endpoints are excluded from the global Express rate limiter via the `skip` predicate to ensure monitoring systems, liveness/readiness probes, and load balancers are never throttled.
  - All other routes remain subject to the global 100 requests per 15-minute window limiter.
- **ESLint Flat Config Migration:**
  - Migrated `apps/web` from deprecated `next lint` to the ESLint CLI (`eslint "src/**/*.{ts,tsx}"`).
  - Added `apps/web/eslint.config.mjs` flat configuration with `@next/eslint-plugin-next` core-web-vitals rules, eliminating the "Next.js plugin was not detected" warning.
- **CI Docker Build Job:**
  - Added `build-docker-api` job to `.github/workflows/ci.yml` that builds the API Docker image (`docker build -f apps/api/Dockerfile .`) after all tests and builds pass.

## 9. Authentication, Security, and Session Management (Prompt 2)
- **Password Security:**
  - Passwords hashed using `@node-rs/argon2` (Argon2id, salt length 16, memoryCost 65536, timeCost 3).
  - Enforces minimum 10 characters and checks against a common password blocklist.
  - Constant-time verification prevents timing attacks.
  - Generic authentication failure response ("Invalid email or password") returned identically for non-existent users and incorrect credentials.
- **Token Architecture & Rotation:**
  - Access tokens: Stateless HS256 JWT, 15-minute lifetime, stored strictly in memory by client app (`apps/web`), never persisted to `localStorage` or `sessionStorage`.
  - Refresh tokens: Cryptographically secure 256-bit random tokens, 30-day lifetime, stored strictly as SHA-256 hashes in database (`refresh_tokens` table).
  - Delivered to client via `httpOnly`, `Secure` (relaxed only when `NODE_ENV !== 'production'`), `SameSite=Strict` cookie scoped to the API host and restricted to path `/auth`.
  - Token Rotation: Every valid `/auth/refresh` rotates the refresh token immediately, updating `replaced_by_id`.
  - Family Reuse Detection: If an already-revoked refresh token is replayed, the entire token family is immediately revoked, protecting against compromised refresh tokens.
  - Password Reset: Single-use token with 1-hour expiry, stored hashed. Resetting a password automatically revokes all refresh tokens across all sessions for that user.
- **CSRF Defense:**
  - Cookie-authenticated endpoints (`/auth/refresh`, `/auth/logout`) enforce strict Origin header validation against the allowed origin list (`APP_URL`, `LANDING_URL`, `http://localhost:3000`), rejecting invalid or missing origins with HTTP 403 Forbidden.
- **Dedicated Rate Limiting:**
  - `/auth/login`: 10 requests per 15-minute window per IP.
  - `/auth/register`: 5 requests per hour per IP.
  - `/auth/forgot-password`: 5 requests per hour per IP.
  - Emits HTTP 429 with explicit `retryAfter` seconds and clear error structure.
- **Email Service & Deferred Email Verification:**
  - Implemented `EmailService` interface with `ConsoleEmailProvider` (development logging) and `ResendEmailProvider` (production delivery via Resend).
  - Decision: Full email verification prior to activation is deferred to a future version.
  - Trade-off & Risk Assessment: Deferring verification reduces initial onboarding friction for early-stage founders to start immediately; the trade-off is the potential risk of unverified or fake accounts. This is mitigated in the interim by rate limiting registration to 5/hour per IP, strict plan limits (3 ideas), and single-use password reset tokens requiring mailbox control.

## 10. Database Schema, Plan Limits, and Idea Versioning (Prompt 2)
- **Database Schema:**
  - All tables (`users`, `refresh_tokens`, `password_reset_tokens`, `plan_limits`, `ideas`, `idea_versions`) use UUID primary keys and track `created_at` and `updated_at`.
  - Foreign keys (`user_id`, `idea_id`, etc.) have dedicated database indexes for query performance.
  - Foreign key relations to users cascade delete or retain integrity.
- **Plan Limits Enforcement:**
  - Stored dynamically in `plan_limits` table rather than hard-coded constants.
  - Free plan seeded with `active_ideas = 3`.
  - Evaluated on server side: users can have at most `limit` ideas with status "active" or "draft".
  - When the user attempts to create or restore an idea at capacity, returns HTTP 403 with stable error code `PLAN_LIMIT_REACHED`, the active count, and the limit.
  - Archiving or deleting an idea reduces the active count and frees a slot.
- **Immutable Version History:**
  - Editing an idea creates a new `idea_versions` row with incremented `version_number` and moves `ideas.current_version_id`.
  - Historical snapshots remain immutable for auditability and future validation comparisons.
- **Isolated Test Database:**
  - Integration tests run strictly against `TEST_DATABASE_URL`.
  - Application checks verify `NODE_ENV === 'test'` and throw an immediate exception if `TEST_DATABASE_URL` is missing or matches `DATABASE_URL` / `DATABASE_URL_UNPOOLED`.
  - CI includes a dedicated `postgres:16` service container with migration runs to test all endpoints end-to-end.

## 11. Container Hardening & Monorepo Packaging (Prompt 2B)
- **Shared Package ESM Compilation:**
  - `packages/shared` compiled to standalone ESM JavaScript (`dist/index.js`) using explicit `.js` extensions in all relative imports/exports (`./brand.js`, `./ai-config.js`, etc.) so that standard Node.js runtime inside Docker containers resolves modules natively without requiring TypeScript transpilers at runtime.
  - Added `src/env-ambient.d.ts` for ambient environment and error typing, ensuring decoupled compilation across isolated environments.
  - Included `"files": ["dist", "src"]` in `packages/shared/package.json` so production packaging packs compiled artifacts.
- **Strict Frozen-Lockfile Enforced:**
  - Removed all `|| pnpm install` fallback logic in Dockerfile. A stale `pnpm-lock.yaml` will immediately fail the Docker build rather than silently installing unpinned dependencies.
- **Root Docker Ignore:**
  - Root `.dockerignore` excludes `node_modules`, `.next`, `dist`, `.git`, `.env`, `.env.*`, coverage, and test output, while preserving `.env.example`.
- **Non-Root Execution & Container Healthcheck:**
  - Runtime container runs as non-root user (`USER node`).
  - Added Docker `HEALTHCHECK` running `wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1`.


