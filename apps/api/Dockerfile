FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@12.11.2

FROM base AS builder
COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile --filter @prvo/api...
RUN pnpm --filter @prvo/shared build
RUN pnpm --filter @prvo/api build
RUN pnpm --filter @prvo/api --prod deploy /app/pruned

FROM node:20-alpine AS runner
WORKDIR /app
# Default NODE_ENV to production; an env file (e.g. via --env-file) may override this
ENV NODE_ENV=production

COPY --from=builder /app/pruned ./
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/drizzle ./apps/api/drizzle
COPY apps/api/drizzle ./drizzle

RUN chown -R node:node /app
USER node

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "apps/api/dist/server.js"]