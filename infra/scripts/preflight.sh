#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
env_file=${ENV_FILE:-$repo_root/.env.production}

fail() {
  echo "Preflight failed: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required"
}

load_env_file() {
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      "" | \#*) continue ;;
      *=*) export "$line" ;;
      *) fail "invalid env line in $env_file: $line" ;;
    esac
  done <"$env_file"
}

require_env() {
  name=$1
  eval "value=\${$name:-}"

  if [ -z "$value" ]; then
    fail "$name is required in $env_file"
  fi

  case "$value" in
    replace-with-* | *example.com*)
      fail "$name still contains a placeholder value"
      ;;
  esac
}

require_absolute_data_path() {
  name=$1
  eval "value=\${$name:-}"

  case "$value" in
    /*) ;;
    *) fail "$name must be an absolute path" ;;
  esac

  case "$value" in
    "$repo_root" | "$repo_root"/*)
      fail "$name must live outside the Git checkout"
      ;;
  esac

  [ -d "$value" ] || fail "$name directory does not exist: $value"
}

require_command docker
require_command curl
require_command openssl
require_command sed
require_command sha256sum

if command -v systemd-detect-virt >/dev/null 2>&1; then
  virt=$(systemd-detect-virt --container 2>/dev/null || true)
  if [ "$virt" != "lxc" ] && [ "${NUTFES_ALLOW_NON_LXC:-}" != "1" ]; then
    fail "run this on the Proxmox LXC, or set NUTFES_ALLOW_NON_LXC=1 only for CI/local script checks"
  fi
fi

[ -f "$env_file" ] || fail "env file not found: $env_file"

mode=$(stat -c "%a" "$env_file" 2>/dev/null || printf unknown)
case "$mode" in
  400 | 600) ;;
  *) fail "$env_file must be mode 0600 or 0400, got $mode" ;;
esac

load_env_file

for name in \
  NEXT_PUBLIC_SITE_URL \
  SITE_URL \
  SUPABASE_SERVER_URL \
  SUPABASE_PUBLIC_URL \
  API_EXTERNAL_URL \
  CLOUDFLARE_TUNNEL_TOKEN \
  APP_IMAGE_TAG \
  POSTGRES_PASSWORD \
  JWT_SECRET \
  JWT_KEYS \
  JWT_JWKS \
  SUPABASE_PUBLISHABLE_KEY \
  SUPABASE_SECRET_KEY \
  ANON_KEY \
  SERVICE_ROLE_KEY \
  ANON_KEY_ASYMMETRIC \
  SERVICE_ROLE_KEY_ASYMMETRIC \
  NUTFES_PUBLIC_ACTION_HASH_SALT \
  S3_PROTOCOL_ACCESS_KEY_ID \
  S3_PROTOCOL_ACCESS_KEY_SECRET \
  SUPABASE_DB_DATA_PATH \
  SUPABASE_STORAGE_DATA_PATH; do
  require_env "$name"
done

require_https_url() {
  name=$1
  eval "value=\${$name:-}"

  case "$value" in
    https://*) ;;
    *) fail "$name must start with https://" ;;
  esac

  case "$value" in
    */) fail "$name must not include a trailing slash" ;;
  esac
}

require_https_url NEXT_PUBLIC_SITE_URL
require_https_url SITE_URL

if [ "$SITE_URL" != "$NEXT_PUBLIC_SITE_URL" ]; then
  fail "SITE_URL must match NEXT_PUBLIC_SITE_URL"
fi

for name in SUPABASE_SERVER_URL SUPABASE_PUBLIC_URL API_EXTERNAL_URL; do
  eval "value=\${$name:-}"
  case "$value" in
    http://kong:8000) ;;
    *) fail "$name must be the Docker-internal Supabase URL http://kong:8000" ;;
  esac
done

require_absolute_data_path SUPABASE_DB_DATA_PATH
require_absolute_data_path SUPABASE_STORAGE_DATA_PATH

docker compose version >/dev/null 2>&1 || fail "docker compose is not available"
docker info >/dev/null 2>&1 || fail "docker daemon is not reachable"

services=$("$repo_root/infra/scripts/compose.sh" config --services)
printf '%s\n' "$services" | grep -qx cloudflared || fail "cloudflared service is missing from production Compose config"
printf '%s\n' "$services" | grep -qx app || fail "app service is missing from production Compose config"
printf '%s\n' "$services" | grep -qx kong || fail "kong service is missing from production Compose config"
if printf '%s\n' "$services" | grep -qx caddy; then
  fail "caddy service must not be present in production Compose config"
fi

rendered_config=$("$repo_root/infra/scripts/compose.sh" config)
if printf '%s\n' "$rendered_config" | grep -Eq 'published: "(80|443)"|published: (80|443)'; then
  fail "production Compose config must not publish host ports 80/443"
fi

echo "Preflight passed."
