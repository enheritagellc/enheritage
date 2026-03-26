FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS installer
COPY package.json pnpm-workspace.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY services/media-ingestion/package.json ./services/media-ingestion/
RUN echo "shamefully-hoist=true" > .npmrc && pnpm install --ignore-scripts

FROM base AS builder
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/.npmrc ./.npmrc
COPY packages/ ./packages/
RUN cd packages/types && pnpm build
COPY services/media-ingestion/ ./services/media-ingestion/
WORKDIR /app/services/media-ingestion
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=installer /app/node_modules ./node_modules
COPY --from=builder /app/services/media-ingestion/dist ./dist
COPY --from=builder /app/services/media-ingestion/package.json ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
