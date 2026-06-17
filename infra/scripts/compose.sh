#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
env_file=${ENV_FILE:-$repo_root/.env.production}
deploy_mode=${DEPLOY_MODE:-vps}

case "$deploy_mode" in
  vps)
    override=$repo_root/compose.vps.yml
    ;;
  cloudflare)
    override=$repo_root/compose.cloudflare.yml
    ;;
  *)
    echo "DEPLOY_MODE must be vps or cloudflare" >&2
    exit 2
    ;;
esac

exec docker compose \
  --env-file "$env_file" \
  -f "$repo_root/compose.prod.yml" \
  -f "$override" \
  "$@"
