#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

usage() {
  echo "Usage: ACCESS_TEAM_DOMAIN=... ACCESS_AUD=... ADMIN_EMAILS='[...]' SCREEN_ACCESS_AUD=... SCREEN_EMAILS='[...]' MEDIA_ORIGIN=... NEXT_PUBLIC_SITE_URL=... NEXT_PUBLIC_TURNSTILE_SITE_KEY=... $0 --env production|staging"
}

if [ "${1:-}" = "--help" ] && [ "$#" -eq 1 ]; then
  usage
  exit 0
fi

if [ "$#" -ne 2 ] || [ "$1" != "--env" ] || { [ "$2" != "production" ] && [ "$2" != "staging" ]; }; then
  usage >&2
  exit 2
fi
target=$2

worktree_status=$(git status --porcelain --untracked-files=all)
if [ -n "$worktree_status" ]; then
  echo "Refusing to deploy from a dirty working tree. Commit or remove every listed change first:" >&2
  printf '%s\n' "$worktree_status" >&2
  exit 2
fi

release_sha=$(git rev-parse HEAD)
if [ "$target" = "production" ] && [ "${CONFIRM_PRODUCTION_DEPLOY:-}" != "$release_sha" ]; then
  echo "Production deploy requires CONFIRM_PRODUCTION_DEPLOY=$release_sha" >&2
  exit 2
fi

: "${ACCESS_TEAM_DOMAIN:?Set ACCESS_TEAM_DOMAIN to the Cloudflare Access team domain}"
: "${ACCESS_AUD:?Set ACCESS_AUD to the Access application audience tag}"
: "${ADMIN_EMAILS:?Set ADMIN_EMAILS to a JSON array of allowed administrator emails}"
: "${SCREEN_ACCESS_AUD:?Set SCREEN_ACCESS_AUD to the venue Screen Access application audience tag}"
: "${SCREEN_EMAILS:?Set SCREEN_EMAILS to a JSON array of allowed venue screen operator emails}"
: "${MEDIA_ORIGIN:?Set MEDIA_ORIGIN to the HTTPS R2 custom-domain origin}"
: "${NEXT_PUBLIC_SITE_URL:?Set NEXT_PUBLIC_SITE_URL to the target application URL}"
: "${NEXT_PUBLIC_TURNSTILE_SITE_KEY:?Set NEXT_PUBLIC_TURNSTILE_SITE_KEY to the environment-specific Turnstile sitekey}"

if [ "$ACCESS_AUD" = "$SCREEN_ACCESS_AUD" ]; then
  echo "ACCESS_AUD and SCREEN_ACCESS_AUD must belong to different Access applications" >&2
  exit 2
fi

case "$NEXT_PUBLIC_TURNSTILE_SITE_KEY" in
  1x00000000000000000000AA|2x00000000000000000000AB|1x00000000000000000000BB|2x00000000000000000000BB|3x00000000000000000000FF)
    echo "Cloudflare Turnstile test sitekeys cannot be deployed to staging or production" >&2
    exit 2
    ;;
esac

validate_https_origin() {
  URL_LABEL=$1 URL_VALUE=$2 URL_KIND=$3 node -e '
    const label = process.env.URL_LABEL;
    const value = process.env.URL_VALUE;
    let url;
    try {
      url = new URL(value);
    } catch {
      console.error(`${label} must be a valid HTTPS origin`);
      process.exit(2);
    }
    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      url.port !== "" ||
      url.pathname !== "/" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      console.error(`${label} must be an HTTPS origin without credentials, port, path, query, or fragment`);
      process.exit(2);
    }
    if (
      process.env.URL_KIND === "access" &&
      (!url.hostname.toLowerCase().endsWith(".cloudflareaccess.com") ||
        url.hostname.length <= ".cloudflareaccess.com".length)
    ) {
      console.error(`${label} must use a *.cloudflareaccess.com hostname`);
      process.exit(2);
    }
  '
}

validate_https_origin ACCESS_TEAM_DOMAIN "$ACCESS_TEAM_DOMAIN" access
validate_https_origin MEDIA_ORIGIN "$MEDIA_ORIGIN" origin
validate_https_origin NEXT_PUBLIC_SITE_URL "$NEXT_PUBLIC_SITE_URL" origin

node -e '
  const value = JSON.parse(process.env.ADMIN_EMAILS);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 10 ||
    value.some((entry) =>
      typeof entry !== "string" ||
      entry !== entry.trim().toLowerCase() ||
      entry.length > 320 ||
      !email.test(entry)
    ) ||
    new Set(value).size !== value.length
  ) process.exit(1);
'

SCREEN_EMAILS="$SCREEN_EMAILS" node -e '
  const value = JSON.parse(process.env.SCREEN_EMAILS);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 10 ||
    value.some((entry) =>
      typeof entry !== "string" ||
      entry !== entry.trim().toLowerCase() ||
      entry.length > 320 ||
      !email.test(entry)
    ) ||
    new Set(value).size !== value.length
  ) process.exit(1);
'

turnstile_hostname=$(URL_VALUE="$NEXT_PUBLIC_SITE_URL" node -e '
  process.stdout.write(new URL(process.env.URL_VALUE).hostname.toLowerCase());
')

if [ "$target" = "staging" ]; then
  turnstile_secrets=$(pnpm exec wrangler secret list --env staging --format json)
else
  turnstile_secrets=$(pnpm exec wrangler secret list --env='' --format json)
fi
SECRETS_JSON="$turnstile_secrets" node -e '
  const secrets = JSON.parse(process.env.SECRETS_JSON);
  if (!Array.isArray(secrets) || !secrets.some((secret) => secret?.name === "TURNSTILE_SECRET_KEY")) {
    console.error("TURNSTILE_SECRET_KEY is not registered for the target Worker environment");
    process.exit(2);
  }
'

stamp_daily_limit=${STAMP_DAILY_LIMIT:-25000}
case "$stamp_daily_limit" in
  ""|*[!0-9]*)
    echo "STAMP_DAILY_LIMIT must be an integer from 0 to 25000" >&2
    exit 2
    ;;
esac
if [ "$stamp_daily_limit" -gt 25000 ]; then
  echo "STAMP_DAILY_LIMIT must be an integer from 0 to 25000" >&2
  exit 2
fi

export NEXT_PUBLIC_MEDIA_ORIGIN=$MEDIA_ORIGIN
./scripts/check-cloudflare-worker.sh

if [ "$target" = "staging" ]; then
  pnpm exec wrangler deploy \
    --env staging \
    --strict \
    --message "git:$release_sha" \
    --var "ACCESS_TEAM_DOMAIN:$ACCESS_TEAM_DOMAIN" \
    --var "ACCESS_AUD:$ACCESS_AUD" \
    --var "ADMIN_EMAILS:$ADMIN_EMAILS" \
    --var "SCREEN_ACCESS_AUD:$SCREEN_ACCESS_AUD" \
    --var "SCREEN_EMAILS:$SCREEN_EMAILS" \
    --var "MEDIA_ORIGIN:$MEDIA_ORIGIN" \
    --var "LOCAL_ADMIN_BYPASS:false" \
    --var "LOCAL_SCREEN_BYPASS:false" \
    --var "LOCAL_TURNSTILE_TEST_MODE:false" \
    --var "STAMP_DAILY_LIMIT:$stamp_daily_limit" \
    --var "TURNSTILE_HOSTNAME:$turnstile_hostname"
else
  pnpm exec wrangler deploy \
    --env='' \
    --strict \
    --message "git:$release_sha" \
    --var "ACCESS_TEAM_DOMAIN:$ACCESS_TEAM_DOMAIN" \
    --var "ACCESS_AUD:$ACCESS_AUD" \
    --var "ADMIN_EMAILS:$ADMIN_EMAILS" \
    --var "SCREEN_ACCESS_AUD:$SCREEN_ACCESS_AUD" \
    --var "SCREEN_EMAILS:$SCREEN_EMAILS" \
    --var "MEDIA_ORIGIN:$MEDIA_ORIGIN" \
    --var "LOCAL_ADMIN_BYPASS:false" \
    --var "LOCAL_SCREEN_BYPASS:false" \
    --var "LOCAL_TURNSTILE_TEST_MODE:false" \
    --var "STAMP_DAILY_LIMIT:$stamp_daily_limit" \
    --var "TURNSTILE_HOSTNAME:$turnstile_hostname"
fi
