# Stage 1: Build Frontend
FROM oven/bun:1-alpine AS frontend-builder

WORKDIR /build

# Copy frontend files
COPY package.json bun.lock ./
COPY tsconfig*.json vite.config.ts ./
COPY index.html ./
COPY public/ ./public/
COPY src/ ./src/

# Install and build
RUN bun install
RUN bun run build

# Stage 2: Build Backend
FROM oven/bun:1-alpine AS backend-builder

WORKDIR /build/server

# Copy backend files
COPY server/package.json ./
COPY server/tsconfig.json ./
COPY server/src/ ./src/
COPY server/prisma/ ./prisma/

# Install production dependencies
RUN bun install --production

# Generate Prisma Client
RUN bunx prisma generate

# Build TypeScript using Bun's native bundler
RUN bun build src/index.ts --outdir dist --target bun && \
    bun build src/utils/seed.ts --outdir dist/utils --target bun

# Stage 3: Runtime with Bun
FROM oven/bun:1-alpine

# Install runtime dependencies including OpenSSL for Prisma
RUN apk add --no-cache \
    sqlite \
    bash \
    jq \
    openssl \
    openssl-dev

WORKDIR /app

# Copy built frontend
COPY --from=frontend-builder /build/dist/ /app/dist/

# Copy backend
COPY --from=backend-builder /build/server/package.json /app/server/
COPY --from=backend-builder /build/server/dist/ /app/server/dist/
COPY --from=backend-builder /build/server/node_modules/ /app/server/node_modules/
COPY --from=backend-builder /build/server/prisma/ /app/server/prisma/

# Copy startup script
COPY addon/run.sh /app/
RUN chmod +x /app/run.sh

EXPOSE 3001

CMD ["/app/run.sh"]
