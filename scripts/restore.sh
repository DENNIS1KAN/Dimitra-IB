#!/usr/bin/env bash
# Restore a Road to Success backup into a FRESH stack (DEPLOY.md).
#
#   scripts/restore.sh backups/rts-20260824.tar.gz
#
# By default it restores into a separate compose project (rts-restore) with
# its own database volume, its own storage directory and its own port, so a
# rehearsal can run beside the live site without touching it. Point it at the
# live project with --project rts only when you mean to.
#
# It refuses to write over anything that already holds data. --force is the
# only way past that, and it says exactly what it would destroy first.

set -Eeuo pipefail

REPO="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
PROJECT="rts-restore"
STORAGE_TARGET=""
APP_BIND_ADDR="127.0.0.1:3100"
FORCE="no"
ARCHIVE=""

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { log "ERROR: $*" >&2; exit 1; }

usage() {
  cat <<USAGE
Usage: scripts/restore.sh ARCHIVE [options]

  --project NAME   compose project to restore into   (default: rts-restore)
  --storage DIR    where storage/ lands              (default: ./restore/NAME/storage)
  --bind ADDR      host address for the app          (default: 127.0.0.1:3100)
  --env FILE       env file for the target stack     (default: .env.production)
  --force          overwrite a target that already has data
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --project) PROJECT="${2:?}"; shift 2 ;;
    --storage) STORAGE_TARGET="${2:?}"; shift 2 ;;
    --bind)    APP_BIND_ADDR="${2:?}"; shift 2 ;;
    --env)     ENV_FILE="${2:?}"; shift 2 ;;
    --force)   FORCE="yes"; shift ;;
    -h|--help) usage; exit 0 ;;
    -*)        die "unknown option: $1" ;;
    *)         ARCHIVE="$1"; shift ;;
  esac
done

[ -n "$ARCHIVE" ] || { usage; exit 1; }
[ -f "$ARCHIVE" ] || die "archive not found: $ARCHIVE"
[ -f "$ENV_FILE" ] || die "$ENV_FILE not found"
command -v docker >/dev/null || die "docker is not on PATH"
ARCHIVE="$(cd "$(dirname "$ARCHIVE")" && pwd)/$(basename "$ARCHIVE")"
[ -n "$STORAGE_TARGET" ] || STORAGE_TARGET="$REPO/restore/$PROJECT/storage"

env_value() {
  sed -n "s/^[[:space:]]*$1=//p" "$ENV_FILE" | tail -n 1 | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}
PG_USER="$(env_value POSTGRES_USER)"; : "${PG_USER:=rts}"
PG_DB="$(env_value POSTGRES_DB)";     : "${PG_DB:=rts}"

compose() {
  STORAGE_PATH="$STORAGE_TARGET" APP_BIND="$APP_BIND_ADDR" \
    docker compose -p "$PROJECT" -f "$COMPOSE_FILE" "$@"
}

# --- unpack -----------------------------------------------------------------
WORK="$(mktemp -d "${TMPDIR:-/tmp}/rts-restore-XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
log "reading $ARCHIVE"
tar -xzf "$ARCHIVE" -C "$WORK"
[ -f "$WORK/db.dump" ] || die "archive has no db.dump: is this a Road to Success backup?"
[ -d "$WORK/storage" ] || die "archive has no storage/: refusing a half restore"
[ -f "$WORK/MANIFEST" ] && sed 's/^/    /' "$WORK/MANIFEST"

# --- bring up the target database -------------------------------------------
# The app comes DOWN first, and is recreated at the end. Two reasons: it must
# not serve half a restore, and storage/ is a bind mount, so a container that
# is running while the directory is refilled keeps looking at the old inode
# and reports every video as missing.
log "stopping the $PROJECT app while the restore runs"
compose rm -sf app >/dev/null 2>&1 || true

log "starting the $PROJECT database"
compose up -d db
for i in $(seq 1 40); do
  if compose exec -T db pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then break; fi
  [ "$i" = 40 ] && die "the $PROJECT database never became ready"
  sleep 2
done

# --- refuse a target that is not empty --------------------------------------
TABLES="$(compose exec -T db psql -tAq -U "$PG_USER" -d "$PG_DB" \
  -c "select count(*) from information_schema.tables where table_schema = 'public'" | tr -d '[:space:]')"
STORAGE_FILES=0
[ -d "$STORAGE_TARGET" ] && STORAGE_FILES="$(find "$STORAGE_TARGET" -type f 2>/dev/null | wc -l | tr -d ' ')"

if [ "${TABLES:-0}" -gt 0 ] || [ "$STORAGE_FILES" -gt 0 ]; then
  if [ "$FORCE" != "yes" ]; then
    log "REFUSING: the target already holds data."
    log "  project $PROJECT database '$PG_DB' has $TABLES tables in schema public"
    log "  $STORAGE_TARGET holds $STORAGE_FILES files"
    log "Restoring would replace both. Re-run with --force if that is what you want,"
    log "or pick an empty target with --project NAME."
    exit 1
  fi
  log "--force given: replacing $TABLES tables and $STORAGE_FILES stored files"
fi

# --- database ---------------------------------------------------------------
# --clean --if-exists makes the restore itself idempotent, so a --force rerun
# lands on the same result rather than colliding with what is already there.
log "restoring postgres"
compose exec -T db pg_restore --clean --if-exists --no-owner --no-privileges \
  -U "$PG_USER" -d "$PG_DB" < "$WORK/db.dump"

# --- files ------------------------------------------------------------------
log "restoring storage into $STORAGE_TARGET"
mkdir -p "$STORAGE_TARGET"
# Empty the contents, never the directory itself: replacing a bind-mounted
# directory swaps the inode out from under any mount that still points at it.
find "$STORAGE_TARGET" -mindepth 1 -delete
cp -a "$WORK/storage/." "$STORAGE_TARGET/"
# uid 1001 is the image's `rts` user; without this the app can read the files
# but cannot write a new submission next to them.
docker run --rm -v "$STORAGE_TARGET":/s alpine:3 chown -R 1001:1001 /s >/dev/null

# --- start the app ----------------------------------------------------------
log "starting the $PROJECT app"
compose up -d --force-recreate app
for i in $(seq 1 40); do
  if curl -fsS "http://$APP_BIND_ADDR/api/health" >/dev/null 2>&1; then break; fi
  [ "$i" = 40 ] && die "the restored app never became healthy"
  sleep 3
done

log "restore complete."
log "  app:      http://$APP_BIND_ADDR"
log "  storage:  $STORAGE_TARGET"
log "  stop it:  docker compose -p $PROJECT -f $COMPOSE_FILE down"
log ""
log "The rehearsal is NOT done until you sign in there, play a video and"
log "download a stamped PDF. A database that restores while the files do not"
log "is exactly what this exercise exists to catch."
