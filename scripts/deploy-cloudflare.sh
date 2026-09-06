#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

./scripts/preflight-cloudflare.sh

set -a
. ./cloudflare.production.env
set +a

release_sha=$(git rev-parse HEAD)
turnstile_hostname=$(URL_VALUE="$CLOUDFLARE_PRODUCTION_SITE_URL" node -e '
  process.stdout.write(new URL(process.env.URL_VALUE).hostname.toLowerCase());
')
pnpm exec wrangler deploy \
  --config wrangler.jsonc \
  --env='' \
  --strict \
  --message "git:$release_sha" \
  --var "ACCESS_TEAM_DOMAIN:$CLOUDFLARE_PRODUCTION_ACCESS_TEAM_DOMAIN" \
  --var "ACCESS_AUD:$CLOUDFLARE_PRODUCTION_ADMIN_AUD" \
  --var "SCREEN_ACCESS_AUD:$CLOUDFLARE_PRODUCTION_SCREEN_AUD" \
  --var "RELEASE_SHA:$release_sha" \
  --var "MEDIA_ORIGIN:$CLOUDFLARE_PRODUCTION_MEDIA_ORIGIN" \
  --var "LOCAL_ADMIN_BYPASS:false" \
  --var "LOCAL_SCREEN_BYPASS:false" \
  --var "LOCAL_TURNSTILE_TEST_MODE:false" \
  --var "TURNSTILE_HOSTNAME:$turnstile_hostname"
