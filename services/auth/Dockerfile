FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS installer
# Provide workspace structure so pnpm can resolve workspace:* deps
COPY package.json pnpm-workspace.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY services/auth/package.json ./services/auth/
RUN echo "shamefully-hoist=true" > .npmrc && pnpm install --ignore-scripts

FROM base AS builder
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/.npmrc ./.npmrc
# Build workspace packages needed for TypeScript compilation
COPY packages/ ./packages/
RUN cd packages/types && pnpm build
# Build service
COPY services/auth/ ./services/auth/
WORKDIR /app/services/auth
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=installer /app/node_modules ./node_modules
COPY --from=builder /app/services/auth/dist ./dist
COPY --from=builder /app/services/auth/package.json ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
