FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS deps
# Copy workspace manifests
COPY package.json pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --ignore-scripts || pnpm install --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
WORKDIR /app/apps/web
RUN pnpm build

FROM node:20-alpine AS runner
RUN npm install -g serve
COPY --from=builder /app/apps/web/dist /app/dist
EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5173 || exit 1
CMD ["serve", "-s", "/app/dist", "-l", "5173"]
