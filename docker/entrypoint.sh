#!/bin/sh
# Container boot order (DEPLOY.md): check the environment, migrate, serve.
# Any failure stops here with a non-zero exit, so a bad deploy never reaches
# a student as a half-working page.
set -eu

node /app/scripts/check-env.mjs
node /app/scripts/migrate.mjs

echo "[boot] starting Road to Success on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec node /app/server.js
