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
require_command pnpm

registry=$(pnpm config get registry)
if [ "$registry" != "https://npm.flatt.tech/" ]; then
  fail "pnpm registry must be https://npm.flatt.tech/ (got $registry)"
fi
pnpm view next version --silent >/dev/null || fail "npm registry is not reachable: https://npm.flatt.tech/"


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
  APP_IMAGE \
  SUPABASE_POSTGRES_IMAGE \
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
  SUPABASE_STORAGE_DATA_PATH \
  ADDITIONAL_REDIRECT_URLS; do
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
required_redirect_url=$SITE_URL/**
case ",$ADDITIONAL_REDIRECT_URLS," in
  *,"$required_redirect_url",*) ;;
  *) fail "ADDITIONAL_REDIRECT_URLS must include $required_redirect_url" ;;
esac

if [ "${DISABLE_SIGNUP:-}" != "true" ]; then
  if [ "${NUTFES_ALLOW_SIGNUP_BOOTSTRAP:-}" = "1" ]; then
    [ "${CONFIRM_BOOTSTRAP_SIGNUP_WINDOW:-}" = "allow-temporary-signup" ] || fail "CONFIRM_BOOTSTRAP_SIGNUP_WINDOW=allow-temporary-signup is required when signup bootstrap is allowed"
    echo "Warning: signup is temporarily enabled for bootstrap; restore DISABLE_SIGNUP=true immediately after bootstrap." >&2
  else
    fail "DISABLE_SIGNUP must be true in production"
  fi
fi

case "$SUPABASE_SERVER_URL" in
  http://kong:8000) ;;
  *) fail "SUPABASE_SERVER_URL must be the Docker-internal Supabase URL http://kong:8000" ;;
esac
case "$SUPABASE_PUBLIC_URL" in
  http://kong:8000) ;;
  *) fail "SUPABASE_PUBLIC_URL must be the Docker-internal Supabase URL http://kong:8000" ;;
esac
case "$API_EXTERNAL_URL" in
  http://kong:8000/auth/v1) ;;
  *) fail "API_EXTERNAL_URL must be the Docker-internal Supabase Auth URL http://kong:8000/auth/v1" ;;
esac

case "$APP_IMAGE" in
  *@sha256:*) ;;
  *) fail "APP_IMAGE must be an immutable image digest reference containing @sha256:" ;;
esac
digest=${APP_IMAGE##*@sha256:}
if ! printf '%s\n' "$digest" | grep -Eq '^[0-9a-f]{64}$'; then
  fail "APP_IMAGE digest must be a 64-character lowercase hex sha256"
fi

case "$SUPABASE_POSTGRES_IMAGE" in
  supabase/postgres:*latest* | *:latest) fail "SUPABASE_POSTGRES_IMAGE must be pinned, not latest" ;;
  supabase/postgres:*) ;;
  *) fail "SUPABASE_POSTGRES_IMAGE must be a pinned supabase/postgres image" ;;
esac

case "${CLOUDFLARED_IMAGE:-}" in
  cloudflare/cloudflared:*latest* | *:latest) fail "CLOUDFLARED_IMAGE must be pinned, not latest" ;;
  cloudflare/cloudflared:*) ;;
  *) fail "CLOUDFLARED_IMAGE must be a pinned cloudflare/cloudflared image" ;;
esac

require_absolute_data_path SUPABASE_DB_DATA_PATH
require_absolute_data_path SUPABASE_STORAGE_DATA_PATH

docker compose version >/dev/null 2>&1 || fail "docker compose is not available"
docker info >/dev/null 2>&1 || fail "docker daemon is not reachable"

services=$("$repo_root/infra/scripts/compose.sh" config --services)
printf '%s\n' "$services" | grep -qx cloudflared || fail "cloudflared service is missing from production Compose config"
printf '%s\n' "$services" | grep -qx app || fail "app service is missing from production Compose config"
printf '%s\n' "$services" | grep -qx kong || fail "kong service is missing from production Compose config"

for forbidden_service in studio realtime meta functions imgproxy supavisor analytics vector caddy; do
  if printf '%s\n' "$services" | grep -qx "$forbidden_service"; then
    fail "$forbidden_service service must not be present in production Compose config"
  fi
done

rendered_config=$("$repo_root/infra/scripts/compose.sh" config)
if printf '%s\n' "$rendered_config" | grep -Eq 'published: "?[0-9]+'; then
  fail "production Compose config must not publish host ports; Cloudflared must be the only ingress"
fi

if printf '%s\n' "$rendered_config" | grep -Eq 'realtime\.sql|_supabase\.sql|webhooks\.sql|logs\.sql|pooler\.sql'; then
  fail "production Compose config must not mount unused Supabase init SQL files"
fi

echo "Preflight passed."
