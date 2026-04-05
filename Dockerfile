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
COPY --from=builder /app/artifacts/api-server/db/ ./db/
COPY --from=builder /app/node_modules/pg/ ./node_modules/pg/
COPY --from=builder /app/node_modules/pg-pool/ ./node_modules/pg-pool/
COPY --from=builder /app/node_modules/pg-protocol/ ./node_modules/pg-protocol/
COPY --from=builder /app/node_modules/pg-types/ ./node_modules/pg-types/
COPY --from=builder /app/node_modules/pgpass/ ./node_modules/pgpass/
COPY --from=builder /app/node_modules/pg-connection-string/ ./node_modules/pg-connection-string/

ENV NODE_ENV=production
EXPOSE 5000

CMD ["sh", "-c", "node db/migrate.mjs && node --enable-source-maps dist/index.mjs"]
