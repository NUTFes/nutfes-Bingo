#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
env_file=${ENV_FILE:-$repo_root/.env.production}
dry_run=false

usage() {
  cat >&2 <<'USAGE'
Usage: reset-production-data.sh [--dry-run]

Stops the production Compose stack and removes the event-scoped Supabase data:
- SUPABASE_DB_DATA_PATH contents
- SUPABASE_STORAGE_DATA_PATH contents
- Compose named volumes such as db_config via `compose down -v`

Safety:
- Requires CONFIRM_RESET_PROD_DATA=1 unless --dry-run is used.
- Refuses paths outside /srv/nutfes-bingo unless NUTFES_ALLOW_RESET_ANY_PATH=1.
- Refuses to delete the data directory itself; only its contents are removed.
USAGE
}

case "${1:-}" in
  "") ;;
  --dry-run) dry_run=true ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    usage
    exit 2
    ;;
esac

fail() {
  echo "Reset production data failed: $*" >&2
  exit 1
}

load_env_file() {
  [ -f "$env_file" ] || fail "env file not found: $env_file"

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      "" | \#*) continue ;;
      *=*) export "$line" ;;
      *) fail "invalid env line in $env_file: $line" ;;
    esac
  done <"$env_file"
}

require_reset_path() {
  name=$1
  eval "value=\${$name:-}"

  [ -n "$value" ] || fail "$name is required in $env_file"

  case "$value" in
    /*) ;;
    *) fail "$name must be an absolute path: $value" ;;
  esac

  case "$value" in
    / | /srv | /srv/ | /srv/nutfes-bingo | /srv/nutfes-bingo/)
      fail "$name is too broad to reset safely: $value"
      ;;
  esac

  case "$value" in
    "$repo_root" | "$repo_root"/*)
      fail "$name must live outside the Git checkout: $value"
      ;;
  esac

  if [ "${NUTFES_ALLOW_RESET_ANY_PATH:-}" != "1" ]; then
    case "$value" in
      /srv/nutfes-bingo/*) ;;
      *) fail "$name must be under /srv/nutfes-bingo or set NUTFES_ALLOW_RESET_ANY_PATH=1 for an explicit test path: $value" ;;
    esac
  fi
}

reset_directory_contents() {
  path=$1

  if [ ! -d "$path" ]; then
    if [ "$dry_run" = true ]; then
      echo "Would create missing directory: $path"
    else
      mkdir -p "$path"
    fi
    return
  fi

  if [ "$dry_run" = true ]; then
    echo "Would remove contents of: $path"
    find "$path" -mindepth 1 -maxdepth 1 -print 2>/dev/null || echo "Cannot list contents without additional permissions: $path"
    return
  fi

  find "$path" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
}

load_env_file
require_reset_path SUPABASE_DB_DATA_PATH
require_reset_path SUPABASE_STORAGE_DATA_PATH

if [ "$dry_run" = true ]; then
  echo "Dry run: production data reset targets"
  reset_directory_contents "$SUPABASE_DB_DATA_PATH"
  reset_directory_contents "$SUPABASE_STORAGE_DATA_PATH"
  echo "Would run: $repo_root/infra/scripts/compose.sh down --remove-orphans -v"
  exit 0
fi

[ "${CONFIRM_RESET_PROD_DATA:-}" = "1" ] || fail "set CONFIRM_RESET_PROD_DATA=1 to wipe production DB and Storage data"

"$repo_root/infra/scripts/compose.sh" down --remove-orphans -v
reset_directory_contents "$SUPABASE_DB_DATA_PATH"
reset_directory_contents "$SUPABASE_STORAGE_DATA_PATH"

mkdir -p "$SUPABASE_DB_DATA_PATH" "$SUPABASE_STORAGE_DATA_PATH"

echo "Production DB and Storage data reset. Next prod deploy will initialize a fresh database from migrations."
