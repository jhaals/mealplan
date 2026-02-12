# Stage 1: Build Frontend
FROM oven/bun:1-alpine AS frontend-builder

WORKDIR /build

# Copy frontend files
COPY package.json bun.lock ./
COPY tsconfig*.json vite.config.ts ./
COPY tailwind.config.js postcss.config.js ./
COPY index.html ./
COPY public/ ./public/
COPY src/ ./src/

# Install and build
RUN bun install
RUN bun run build

# Stage 2: Build Backend
FROM node:22-alpine AS backend-builder

# Install bun for package management
RUN npm install -g bun

WORKDIR /build/server

# Copy backend files
COPY server/package.json ./
COPY server/tsconfig.json ./
COPY server/prisma.config.ts ./
COPY server/src/ ./src/
COPY server/prisma/ ./prisma/

# Install dependencies
RUN bun install

# Generate Prisma Client
RUN npx prisma generate

# Stage 3: Runtime with Node.js
FROM node:22-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    bash \
    jq

WORKDIR /app

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
