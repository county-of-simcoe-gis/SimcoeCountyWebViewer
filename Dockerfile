# syntax=docker/dockerfile:1

###############################################################################
# Base image: Node 22 on Debian slim (glibc).
# - Next.js 16 requires Node >= 20.9
# - canvas ships prebuilt linux-x64 glibc binaries (no node-gyp needed)
# - Prisma binaryTargets in prisma/schema.prisma already include debian-openssl-3.0.x
###############################################################################
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# libssl3 (OpenSSL 3) — required at runtime by the Prisma query engine
# (debian-openssl-3.0.x binary target) and so Prisma detects the right platform.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libssl3 \
    && rm -rf /var/lib/apt/lists/*

###############################################################################
# deps: install ALL dependencies (dev deps required for the Next.js build)
###############################################################################
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Optional corporate proxy CA — required for npm/prisma downloads through a
# TLS-inspecting proxy. Build with --build-arg CORP_CA=true and set CORP_CA_FILE
# to the CA cert filename placed in the ./certs directory.
# Leave CORP_CA unset (default false) when building outside the corporate network.
ARG CORP_CA=false
ARG CORP_CA_FILE=
COPY certs ./certs
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && if [ "$CORP_CA" = "true" ] && [ -n "$CORP_CA_FILE" ] && [ -f "certs/$CORP_CA_FILE" ]; then \
        cp "certs/$CORP_CA_FILE" /usr/local/share/ca-certificates/corporate-ca.crt \
        && update-ca-certificates \
        && npm config set cafile /etc/ssl/certs/ca-certificates.crt; \
    fi
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Generate only the engine matching this image (deterministic — avoids
# Prisma misdetecting the platform and downloading the wrong engine).
RUN npm ci \
    && npx prisma generate --no-hints \
    && ls node_modules/.prisma/client

###############################################################################
# dev: used by docker-compose.dev.yml for local development with hot reload
###############################################################################
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=development \
    CHOKIDAR_USEPOLLING=true \
    WATCHPACK_POLLING=true
EXPOSE 3000
CMD ["npx", "next", "dev", "--webpack"]

###############################################################################
# builder: compile the production standalone bundle
###############################################################################
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time.
# Pass them via `docker compose build` args (sourced from your .env).
ARG NEXT_PUBLIC_BASE_PATH=
ARG NEXT_PUBLIC_MAP_URL_SECURE=
ARG NEXT_PUBLIC_MAP_URL_UNSECURE=
ARG NEXT_PUBLIC_ESRI_PORTAL_URL=
ARG NEXT_PUBLIC_ESRI_APP_ID=
ARG NEXT_PUBLIC_COLLECT_APP_STATS=false
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH} \
    NEXT_PUBLIC_MAP_URL_SECURE=${NEXT_PUBLIC_MAP_URL_SECURE} \
    NEXT_PUBLIC_MAP_URL_UNSECURE=${NEXT_PUBLIC_MAP_URL_UNSECURE} \
    NEXT_PUBLIC_ESRI_PORTAL_URL=${NEXT_PUBLIC_ESRI_PORTAL_URL} \
    NEXT_PUBLIC_ESRI_APP_ID=${NEXT_PUBLIC_ESRI_APP_ID} \
    NEXT_PUBLIC_COLLECT_APP_STATS=${NEXT_PUBLIC_COLLECT_APP_STATS}

ENV NODE_ENV=production
RUN node scripts/copy-readme.js \
    && npx next build --webpack

###############################################################################
# runner: minimal production image (standalone server only)
###############################################################################
FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Non-root user provided by the node image
USER node

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://localhost:3000'+(process.env.NEXT_PUBLIC_BASE_PATH||'')).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
