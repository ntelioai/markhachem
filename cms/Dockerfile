# To use this Dockerfile, you have to set `output: 'standalone'` in your next.config.mjs file.
# From https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

FROM node:22.17.0-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm install --no-audit --no-fund; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Force-install native binaries for the target platform.
# The lockfile (generated on macOS) doesn't list the linuxmusl-x64 optional deps
# (@img/sharp-linuxmusl-x64, @libsql/linux-x64-musl), so npm install skips them
# even when running on linuxmusl-x64. We re-install with explicit platform flags.
# See https://sharp.pixelplumbing.com/install#cross-platform
RUN npm install --no-save --cpu=x64 --os=linux --libc=musl sharp @libsql/client


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time placeholders for Payload's init check during page data collection.
# These are NOT baked into the runtime image — env_file in docker-compose.yml
# supplies the real values when the container starts.
ENV PAYLOAD_SECRET=build-time-placeholder-not-used-at-runtime
ENV DATABASE_URI=file:/tmp/build-only.db
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* is inlined by `next build` — must be set at build time, not
# runtime. Passed through from docker-compose.yml (which reads cms/.env).
ARG NEXT_PUBLIC_SITE_URL=https://www.markhachem.com
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Remove this line if you do not have this folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -q --spider http://localhost:3000/admin || exit 1

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD HOSTNAME="0.0.0.0" node server.js
