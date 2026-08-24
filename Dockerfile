# Production image for Road to Success (DEPLOY.md).
#
# Three stages so the thing that ships carries no npm cache, no dev
# dependencies and no TypeScript: deps installs, builder compiles to
# .next/standalone (Next traces the server and only the node_modules it
# actually reaches), runner is node plus those traced files.

# ---------------------------------------------------------------- deps
FROM node:22-alpine AS deps
# Next's SWC binaries want glibc symbols that musl provides through this shim.
RUN apk add --no-cache libc6-compat
WORKDIR /app
# package-lock.json is not committed (see .gitignore: it is too large for this
# repo's push path), so a clone installs from package.json. When a lockfile is
# present, use it.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

# ------------------------------------------------------------- builder
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No database is touched here: db/index.ts is a lazy Proxy, so the build runs
# with no DATABASE_URL and nothing to connect to.
RUN npm run build

# -------------------------------------------------------------- runner
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as the image's own unprivileged user. The uid matters: storage/ is a
# bind mount on the host, and the files the app writes there must stay
# readable by the backup script.
RUN addgroup -g 1001 -S rts && adduser -u 1001 -S rts -G rts

COPY --from=builder --chown=rts:rts /app/.next/standalone ./
COPY --from=builder --chown=rts:rts /app/.next/static ./.next/static

# The migrator runs outside Next, so it is not part of the traced bundle:
# give it its two packages and the SQL explicitly.
COPY --from=deps --chown=rts:rts /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps --chown=rts:rts /app/node_modules/postgres ./node_modules/postgres
COPY --chown=rts:rts db/migrations ./db/migrations
COPY --chown=rts:rts scripts/migrate.mjs scripts/check-env.mjs scripts/create-admin.mjs ./scripts/
COPY --chown=rts:rts docker/entrypoint.sh ./docker/entrypoint.sh

# Videos, PDFs and submitted photos (SPEC §15.7 #25). Created here so the
# volume mounts onto a directory the app user already owns.
RUN mkdir -p /app/storage && chown -R rts:rts /app/storage

USER rts
EXPOSE 3000
VOLUME ["/app/storage"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/docker/entrypoint.sh"]
