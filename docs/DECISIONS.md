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
