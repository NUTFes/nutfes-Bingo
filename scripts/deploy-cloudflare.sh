#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

./scripts/preflight-cloudflare.sh

set -a
. ./cloudflare.project.env
. ./.cloudflare.deploy.production.env
set +a

release_sha=$(git rev-parse HEAD)
stamp_daily_limit=${STAMP_DAILY_LIMIT:-25000}
turnstile_hostname=$(URL_VALUE="$CLOUDFLARE_PRODUCTION_SITE_URL" node -e '
  process.stdout.write(new URL(process.env.URL_VALUE).hostname.toLowerCase());
')
export VITE_TURNSTILE_SITE_KEY=$CLOUDFLARE_PRODUCTION_TURNSTILE_SITE_KEY

test -f dist/client/index.html

./scripts/cloudflare-wrangler.sh deploy \
  --strict \
  --message "git:$release_sha" \
  --var "ACCESS_TEAM_DOMAIN:$CLOUDFLARE_PRODUCTION_ACCESS_TEAM_DOMAIN" \
  --var "ACCESS_AUD:$CLOUDFLARE_PRODUCTION_ADMIN_AUD" \
  --var "ADMIN_EMAILS:$ADMIN_EMAILS" \
  --var "SCREEN_ACCESS_AUD:$CLOUDFLARE_PRODUCTION_SCREEN_AUD" \
  --var "RELEASE_SHA:$release_sha" \
  --var "SCREEN_EMAILS:$SCREEN_EMAILS" \
  --var "MEDIA_ORIGIN:$CLOUDFLARE_PRODUCTION_MEDIA_ORIGIN" \
  --var "LOCAL_ADMIN_BYPASS:false" \
  --var "LOCAL_SCREEN_BYPASS:false" \
  --var "LOCAL_TURNSTILE_TEST_MODE:false" \
  --var "STAMP_DAILY_LIMIT:$stamp_daily_limit" \
  --var "TURNSTILE_HOSTNAME:$turnstile_hostname"
