
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Install dependencies including devDependencies (needed for build)
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Environment variables must be present at build time for Next.js if they are public
# But strict secrets should be runtime. Next.js inline inlines NEXT_PUBLIC_ vars.
ENV NEXT_TELEMETRY_DISABLED 1
# Dummy URL to satisfy Prisma build-time validation
ENV DATABASE_URL="file:/tmp/dummy.db"

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000

# Install necessary system libraries for Prisma
RUN apk add --no-cache libc6-compat openssl

# Install Prisma CLI globally for migrations on VPS
RUN npm install -g prisma

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built artifacts
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy prisma schema for migrations/runtime checks if needed
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Switch to non-root user
# USER nextjs

EXPOSE 3000

ENV HOSTNAME "0.0.0.0"

# Robust CMD: Create dir, run app, or sleep if it crashes to allow debugging
CMD ["sh", "-c", "mkdir -p /app/database && node server.js || { echo 'CRASHED: Sleeping 1h for debug'; sleep 3600; }"]
