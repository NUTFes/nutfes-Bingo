#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
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

exec docker compose \
  --env-file "$env_file" \
  -f "$repo_root/compose.prod.yml" \
  -f "$repo_root/compose.cloudflare.yml" \
  "$@"
