#!/usr/bin/env bash
# Nightly backup for Road to Success (DEPLOY.md).
#
# One archive holds BOTH halves, because either one alone restores to a broken
# platform: the Postgres dump (who, when, what was submitted) and storage/
# (every video, PDF and submitted photo).
#
#   backups/rts-YYYYMMDD.tar.gz
#     db.dump      pg_dump -Fc, restored with pg_restore
#     storage/     the files, exactly as the app wrote them
#     MANIFEST     what this is and what made it
#
# Safe to run from cron: no reliance on the caller's directory, a lock so two
# runs cannot overlap, timestamped output for the cron mail, and the archive
# only appears at its final name once it is complete.

set -Eeuo pipefail

REPO="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
PROJECT="${COMPOSE_PROJECT:-rts}"
KEEP="${KEEP:-14}"
BACKUP_DIR="${BACKUP_DIR:-$REPO/backups}"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { log "ERROR: $*" >&2; exit 1; }

# Read one key out of the env file without sourcing it: a backup script has no
# business executing whatever is in there.
env_value() {
  sed -n "s/^[[:space:]]*$1=//p" "$ENV_FILE" | tail -n 1 | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

[ -f "$ENV_FILE" ] || die "$ENV_FILE not found (copy .env.production.example)"
command -v docker >/dev/null || die "docker is not on PATH"

# One run at a time. Without this, a slow backup and the next night's cron
# would both tar storage/ and both write the same archive name.
LOCK="$BACKUP_DIR/.backup.lock"
mkdir -p "$BACKUP_DIR"
if command -v flock >/dev/null; then
  exec 9>"$LOCK"
  flock -n 9 || die "another backup is still running"
fi

PG_USER="$(env_value POSTGRES_USER)"
PG_DB="$(env_value POSTGRES_DB)"
: "${PG_USER:=rts}"
: "${PG_DB:=rts}"
# Same precedence compose uses for the bind mount: an exported STORAGE_PATH
# wins, then the env file, then the default ./storage. In production none of
# this is set and all three agree.
STORAGE_PATH="${STORAGE_PATH:-$(env_value STORAGE_PATH)}"
: "${STORAGE_PATH:=$REPO/storage}"
[ -d "$STORAGE_PATH" ] || die "storage directory not found: $STORAGE_PATH"

STAMP="$(date '+%Y%m%d')"
TARGET="$BACKUP_DIR/rts-$STAMP.tar.gz"
WORK="$(mktemp -d "$BACKUP_DIR/.work-XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

log "backup starting (project=$PROJECT db=$PG_DB storage=$STORAGE_PATH)"

# --- database ---------------------------------------------------------------
# -Fc is the custom format: compressed, and pg_restore can be selective about
# what it puts back. Runs inside the db container, so the host needs no
# postgres client and the version can never drift from the server's.
log "dumping postgres"
docker compose -p "$PROJECT" -f "$COMPOSE_FILE" exec -T db \
  pg_dump -Fc --no-owner --no-privileges -U "$PG_USER" "$PG_DB" > "$WORK/db.dump" \
  || die "pg_dump failed (is the stack up?)"
[ -s "$WORK/db.dump" ] || die "pg_dump produced an empty file"

# --- files ------------------------------------------------------------------
log "copying storage"
mkdir -p "$WORK/storage"
# -a keeps mtimes, so a restore looks like the original rather than like today.
cp -a "$STORAGE_PATH/." "$WORK/storage/"

# --- manifest ---------------------------------------------------------------
{
  echo "product:     Road to Success"
  echo "created:     $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "host:        $(hostname)"
  echo "project:     $PROJECT"
  echo "database:    $PG_DB"
  echo "git:         $(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo "db.dump:     $(wc -c < "$WORK/db.dump" | tr -d ' ') bytes"
  echo "storage:     $(find "$WORK/storage" -type f | wc -l | tr -d ' ') files"
  echo "restore:     scripts/restore.sh <this archive>"
} > "$WORK/MANIFEST"

# --- archive ----------------------------------------------------------------
log "writing $TARGET"
tar -czf "$TARGET.partial" -C "$WORK" MANIFEST db.dump storage
mv "$TARGET.partial" "$TARGET"

# --- retention --------------------------------------------------------------
# Newest KEEP archives survive; anything older goes. Sorted by name, which is
# the date, so this does not depend on filesystem timestamps.
# (a plain loop, not mapfile: macOS still ships bash 3.2 and a backup script
# should run wherever it is pointed)
ls -1 "$BACKUP_DIR"/rts-*.tar.gz 2>/dev/null | sort -r | tail -n +$((KEEP + 1)) | while read -r f; do
  [ -n "$f" ] || continue
  log "pruning $(basename "$f")"
  rm -f "$f"
done

log "backup complete: $TARGET ($(du -h "$TARGET" | cut -f1))"
