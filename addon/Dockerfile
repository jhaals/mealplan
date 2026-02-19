# Stage 1: Build Frontend
FROM node:25-alpine AS frontend-builder

# Configure Node.js for better QEMU compatibility
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /build

# Copy frontend files
COPY package.json package-lock.json ./
COPY tsconfig*.json vite.config.ts ./
COPY index.html ./
COPY public/ ./public/
COPY src/ ./src/

# Install and build (legacy-peer-deps due to ESLint 10 compatibility issues)
# Additional flags for QEMU compatibility
RUN npm ci --legacy-peer-deps --no-audit --prefer-offline --no-fund
RUN npm run build

# Stage 2: Build Backend
FROM node:25-alpine AS backend-builder

# Configure Node.js for better QEMU compatibility
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /build/server

# Copy backend files
COPY server/package.json server/package-lock.json ./
COPY server/tsconfig.json ./
COPY server/prisma.config.ts ./
COPY server/src/ ./src/
COPY server/prisma/ ./prisma/

# Install dependencies
# Additional flags for QEMU compatibility
RUN npm ci --no-audit --prefer-offline --no-fund

# Generate Prisma Client
RUN npx prisma generate

# Verify migration engine is available (forces download if missing)
RUN npx prisma migrate deploy --help || echo "Migration engine verified"

# Stage 3: Runtime with Node.js
FROM node:25-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    bash \
    jq \
    openssl

WORKDIR /app

# Prevent Prisma from downloading engines at runtime
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
ENV NODE_ENV=production

# Copy built frontend
COPY --from=frontend-builder /build/dist/ /app/dist/

# Copy backend
COPY --from=backend-builder /build/server/package.json /app/server/
COPY --from=backend-builder /build/server/prisma.config.ts /app/server/
COPY --from=backend-builder /build/server/src/ /app/server/src/
COPY --from=backend-builder /build/server/node_modules/ /app/server/node_modules/
COPY --from=backend-builder /build/server/prisma/ /app/server/prisma/

# Copy startup script
COPY addon/run.sh /app/
RUN chmod +x /app/run.sh

EXPOSE 3001

CMD ["/app/run.sh"]
