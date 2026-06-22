#!/bin/sh

set -eu
umask 077

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
env_file=${ENV_FILE:-$repo_root/.env.production}
backup_root=${1:-$repo_root/backups}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir=$backup_root/$timestamp

compose() {
  ENV_FILE="$env_file" "$repo_root/infra/scripts/compose.sh" "$@"
}

mkdir -p "$backup_root"
if ! mkdir "$backup_dir"; then
  echo "Backup directory already exists: $backup_dir" >&2
  exit 1
fi

services_stopped=false
restart_services() {
  if [ "$services_stopped" = true ]; then
    compose up -d --wait >/dev/null
  fi
}
trap restart_services EXIT HUP INT TERM

compose stop cloudflared app kong auth rest storage >/dev/null
services_stopped=true

compose exec -T db pg_dump -U postgres -d postgres -Fc >"$backup_dir/postgres.dump"
compose exec -T db pg_dumpall -U postgres --globals-only >"$backup_dir/globals.sql"
compose run --rm --no-deps -T --entrypoint tar storage \
  -C /var/lib/storage -czf - . >"$backup_dir/storage.tar.gz"
compose images --format json >"$backup_dir/images.json"

restart_services
services_stopped=false

(
  cd "$backup_dir"
  sha256sum postgres.dump globals.sql storage.tar.gz images.json >SHA256SUMS
)

echo "Backup created at $backup_dir"
