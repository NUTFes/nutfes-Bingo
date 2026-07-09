#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cmd=${1:-}

usage() {
  cat >&2 <<'USAGE'
Usage: annual-ops.sh COMMAND [ARGS...]

Commands:
  preflight        Validate the Proxmox LXC + Cloudflared production setup
  deploy           Run preflight, deploy the stack, then smoke test it
  smoke [APP_URL]  Smoke test Next.js, defaulting to .env.production
  backup [DIR]     Back up PostgreSQL and Storage
  migrate:dry-run  Preview pending Supabase migrations
USAGE
}

load_env() {
  env_file=${ENV_FILE:-$repo_root/.env.production}
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      "" | \#*) continue ;;
      *=*) export "$line" ;;
      *)
        echo "Invalid env line in $env_file: $line" >&2
        exit 1
        ;;
    esac
  done <"$env_file"
}

case "$cmd" in
  preflight)
    exec "$repo_root/infra/scripts/preflight.sh"
    ;;
  deploy)
    "$repo_root/infra/scripts/preflight.sh"
    "$repo_root/infra/scripts/annual-ops.sh" migrate:dry-run
    "$repo_root/infra/scripts/deploy.sh"
    "$repo_root/infra/scripts/annual-ops.sh" smoke
    ;;
  smoke)
    shift
    load_env
    app_url=${1:-${NEXT_PUBLIC_SITE_URL:?NEXT_PUBLIC_SITE_URL is required}}
    exec "$repo_root/infra/scripts/smoke-test.sh" "$app_url"
    ;;
  backup)
    shift
    exec "$repo_root/infra/scripts/backup.sh" "$@"
    ;;
  migrate:dry-run)
    exec "$repo_root/infra/scripts/compose.sh" run --rm --entrypoint /bin/sh migrate -ec \
      'exec /tool/node_modules/.bin/supabase db push --dry-run --db-url "postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/postgres"'
    ;;
  *)
    usage
    exit 2
    ;;
esac
