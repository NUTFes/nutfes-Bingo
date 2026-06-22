#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
env_file=${ENV_FILE:-$repo_root/.env.production}

exec docker compose \
  --env-file "$env_file" \
  -f "$repo_root/compose.prod.yml" \
  -f "$repo_root/compose.cloudflare.yml" \
  "$@"
