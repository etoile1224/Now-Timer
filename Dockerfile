FROM node:22-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build api-server
RUN cd artifacts/api-server && pnpm run build

# --- Production stage ---
FROM node:22-slim

WORKDIR /app

COPY --from=builder /app/artifacts/api-server/dist/ ./dist/

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
