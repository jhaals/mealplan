# Stage 1: Build Frontend
FROM node:26.12.1-alpine AS frontend-builder

# Configure Node.js for better QEMU compatibility
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /build

# Copy frontend files
COPY package.json package-lock.json ./
COPY tsconfig*.json vite.config.ts ./
COPY index.html ./
# tokens.css lives at the project root (it is the portable design-token export)
# and is @imported by src/styles/globals.css. It must be in the build context or
# the CSS fails to resolve. See design.md.
COPY tokens.css ./
COPY public/ ./public/
COPY src/ ./src/

# Install and build (legacy-peer-deps due to ESLint 10 compatibility issues)
# Additional flags for QEMU compatibility
RUN npm ci --legacy-peer-deps --no-audit --prefer-offline --no-fund
RUN npm run build

# Stage 2: Compile the Rust backend for the target architecture.
FROM rust:1.99-alpine AS backend-builder
RUN apk add --no-cache musl-dev
WORKDIR /build/server
COPY server/Cargo.toml server/Cargo.lock server/build.rs ./
COPY server/src/ ./src/
COPY server/migrations/ ./migrations/
RUN cargo build --locked --release

# Stage 3: The runtime needs only the binary, frontend, and add-on configuration tools.
FROM alpine:3.24
RUN apk add --no-cache bash jq ca-certificates tzdata
WORKDIR /app/server
COPY --from=frontend-builder /build/dist/ /app/dist/
COPY --from=backend-builder /build/server/target/release/mealplan-server /app/server/mealplan-server
COPY --from=backend-builder /build/server/target/release/migrate-legacy /app/server/migrate-legacy
COPY addon/run.sh /app/run.sh
RUN chmod +x /app/run.sh
EXPOSE 3001
CMD ["/app/run.sh"]
