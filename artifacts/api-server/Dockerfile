# ── Builder stage ────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy workspace manifests and lockfile first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY lib/ ./lib/
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json

# Install all dependencies (including devDependencies needed for the build)
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY artifacts/api-server/ ./artifacts/api-server/

RUN pnpm --filter @workspace/api-server run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-slim

WORKDIR /app

# Copy the entire node_modules from the builder so all packages (including pg)
# are available at runtime — in particular for the migration runner.
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/artifacts/api-server/dist/ ./dist/
COPY --from=builder /app/artifacts/api-server/db/ ./db/

ENV NODE_ENV=production

# Run migrations then start the server
CMD node db/migrate.mjs && node --enable-source-maps dist/index.mjs
