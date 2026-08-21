#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

set -a
. ./cloudflare.project.env
set +a

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

current_branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)
if [ "$current_branch" != "$CLOUDFLARE_RELEASE_BRANCH" ]; then
  echo "Deploys must run from the configured release branch: $CLOUDFLARE_RELEASE_BRANCH" >&2
  exit 2
fi

upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)
expected_upstream=origin/$CLOUDFLARE_RELEASE_BRANCH
if [ "$upstream" != "$expected_upstream" ]; then
  echo "Release branch must track $expected_upstream" >&2
  exit 2
fi

git fetch --quiet origin "$CLOUDFLARE_RELEASE_BRANCH"
release_sha=$(git rev-parse HEAD)
remote_sha=$(git rev-parse "refs/remotes/$expected_upstream")
if [ "$release_sha" != "$remote_sha" ]; then
  echo "Release HEAD must be pushed and exactly match $expected_upstream" >&2
  exit 2
fi

./scripts/check-cloudflare-operator.sh --env "$target"

if [ "$target" = "production" ]; then
  if [ "${CONFIRM_PRODUCTION_DEPLOY:-}" != "$release_sha" ]; then
    echo "Production deploy requires CONFIRM_PRODUCTION_DEPLOY=$release_sha" >&2
    exit 2
  fi

  staging_deployments=$(./scripts/cloudflare-wrangler.sh --target staging deployments list --env staging --json)
  staging_version_id=$(
    DEPLOYMENTS_JSON=$staging_deployments RELEASE_SHA=$release_sha node - <<'NODE'
const deployments = JSON.parse(process.env.DEPLOYMENTS_JSON);
const latest = deployments
  .filter((deployment) => typeof deployment?.created_on === "string")
  .toSorted((left, right) => Date.parse(left.created_on) - Date.parse(right.created_on))
  .at(-1);
const expectedMessage = `git:${process.env.RELEASE_SHA}`;
if (latest?.annotations?.["workers/message"] !== expectedMessage) {
  console.error(`Active staging deployment must have message ${expectedMessage}`);
  process.exit(2);
}
const activeVersions = Array.isArray(latest.versions)
  ? latest.versions.filter((version) => version?.percentage === 100)
  : [];
if (activeVersions.length !== 1 || typeof activeVersions[0].version_id !== "string") {
  console.error("Active staging deployment must contain exactly one 100% version");
  process.exit(2);
}
process.stdout.write(activeVersions[0].version_id);
NODE
  )
  staging_smoke_record=${STAGING_SMOKE_RECORD:-.cloudflare/deployments/staging-$release_sha.json}
  node scripts/verify-cloudflare-smoke-record.mjs \
    "$staging_smoke_record" \
    "$release_sha" \
    "$staging_version_id"
fi

: "${ACCESS_TEAM_DOMAIN:?Set ACCESS_TEAM_DOMAIN to the Cloudflare Access team domain}"
: "${ACCESS_AUD:?Set ACCESS_AUD to the Access application audience tag}"
: "${ADMIN_EMAILS:?Set ADMIN_EMAILS to a JSON array of allowed administrator emails}"
: "${SCREEN_ACCESS_AUD:?Set SCREEN_ACCESS_AUD to the venue Screen Access application audience tag}"
: "${SCREEN_EMAILS:?Set SCREEN_EMAILS to a JSON array of allowed venue screen operator emails}"
: "${MEDIA_ORIGIN:?Set MEDIA_ORIGIN to the HTTPS R2 custom-domain origin}"
: "${NEXT_PUBLIC_SITE_URL:?Set NEXT_PUBLIC_SITE_URL to the target application URL}"
: "${NEXT_PUBLIC_TURNSTILE_SITE_KEY:?Set NEXT_PUBLIC_TURNSTILE_SITE_KEY to the environment-specific Turnstile sitekey}"

case "$target" in
  production)
    expected_access_team_domain=$CLOUDFLARE_PRODUCTION_ACCESS_TEAM_DOMAIN
    expected_site_url=$CLOUDFLARE_PRODUCTION_SITE_URL
    expected_media_origin=$CLOUDFLARE_PRODUCTION_MEDIA_ORIGIN
    expected_access_aud=$CLOUDFLARE_PRODUCTION_ADMIN_AUD
    expected_screen_aud=$CLOUDFLARE_PRODUCTION_SCREEN_AUD
    expected_turnstile_site_key=$CLOUDFLARE_PRODUCTION_TURNSTILE_SITE_KEY
    ;;
  staging)
    expected_access_team_domain=$CLOUDFLARE_STAGING_ACCESS_TEAM_DOMAIN
    expected_site_url=$CLOUDFLARE_STAGING_SITE_URL
    expected_media_origin=$CLOUDFLARE_STAGING_MEDIA_ORIGIN
    expected_access_aud=$CLOUDFLARE_STAGING_ADMIN_AUD
    expected_screen_aud=$CLOUDFLARE_STAGING_SCREEN_AUD
    expected_turnstile_site_key=$CLOUDFLARE_STAGING_TURNSTILE_SITE_KEY
    ;;
esac

require_expected() {
  label=$1
  actual=$2
  expected=$3
  if [ "$actual" != "$expected" ]; then
    echo "$label does not match the reviewed $target value in cloudflare.project.env" >&2
    exit 2
  fi
}

require_expected ACCESS_TEAM_DOMAIN "$ACCESS_TEAM_DOMAIN" "$expected_access_team_domain"
require_expected ACCESS_AUD "$ACCESS_AUD" "$expected_access_aud"
require_expected SCREEN_ACCESS_AUD "$SCREEN_ACCESS_AUD" "$expected_screen_aud"
require_expected MEDIA_ORIGIN "$MEDIA_ORIGIN" "$expected_media_origin"
require_expected NEXT_PUBLIC_SITE_URL "$NEXT_PUBLIC_SITE_URL" "$expected_site_url"
require_expected NEXT_PUBLIC_TURNSTILE_SITE_KEY \
  "$NEXT_PUBLIC_TURNSTILE_SITE_KEY" \
  "$expected_turnstile_site_key"

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

TARGET=$target \
  PRODUCTION_ACCOUNT_OWNER_EMAIL=${CLOUDFLARE_PRODUCTION_ACCOUNT_OWNER_EMAIL:-} \
  ADMIN_EMAILS="$ADMIN_EMAILS" \
  SCREEN_EMAILS="$SCREEN_EMAILS" \
  node - <<'NODE'
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const reservedEmailDomainPattern =
  /@(?:example\.(?:com|net|org)|[^@]+\.(?:example|invalid|test)|localhost)$/i;
const requirements = {
  ADMIN_EMAILS: {
    minimum: 1,
    maximum: 20,
    purpose: "named event administrators",
  },
  SCREEN_EMAILS: {
    minimum: 1,
    maximum: 10,
    purpose: "named venue operators",
  },
};

for (const [name, requirement] of Object.entries(requirements)) {
  let value;
  try {
    value = JSON.parse(process.env[name]);
  } catch {
    console.error(`${name} must be a JSON array`);
    process.exit(2);
  }
  if (
    !Array.isArray(value) ||
    value.length < requirement.minimum ||
    value.length > requirement.maximum ||
    value.some(
      (entry) =>
        typeof entry !== "string" ||
        entry !== entry.trim().toLowerCase() ||
        entry.length > 320 ||
        !emailPattern.test(entry) ||
        reservedEmailDomainPattern.test(entry),
    ) ||
    new Set(value).size !== value.length
  ) {
    console.error(
      `${name} must contain ${requirement.minimum}-${requirement.maximum} unique lowercase emails for ${requirement.purpose} and no reserved-domain placeholders`,
    );
    process.exit(2);
  }
  if (
    name === "ADMIN_EMAILS" &&
    process.env.TARGET === "production" &&
    value.includes(process.env.PRODUCTION_ACCOUNT_OWNER_EMAIL?.toLowerCase())
  ) {
    console.error(
      "ADMIN_EMAILS must not contain the shared production Cloudflare account owner address",
    );
    process.exit(2);
  }
}
NODE

turnstile_hostname=$(URL_VALUE="$NEXT_PUBLIC_SITE_URL" node -e '
  process.stdout.write(new URL(process.env.URL_VALUE).hostname.toLowerCase());
')

if [ "$target" = "staging" ]; then
  turnstile_secrets=$(
    ./scripts/cloudflare-wrangler.sh --target staging \
      secret list --env staging --format json
  )
else
  turnstile_secrets=$(
    ./scripts/cloudflare-wrangler.sh --target production \
      secret list --env='' --format json
  )
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
./scripts/check-cloudflare-worker.sh --env "$target"

if [ "$target" = "staging" ]; then
  ./scripts/cloudflare-wrangler.sh --target staging deploy \
    --env staging \
    --strict \
    --message "git:$release_sha" \
    --var "ACCESS_TEAM_DOMAIN:$ACCESS_TEAM_DOMAIN" \
    --var "ACCESS_AUD:$ACCESS_AUD" \
    --var "ADMIN_EMAILS:$ADMIN_EMAILS" \
    --var "SCREEN_ACCESS_AUD:$SCREEN_ACCESS_AUD" \
    --var "RELEASE_SHA:$release_sha" \
    --var "SCREEN_EMAILS:$SCREEN_EMAILS" \
    --var "MEDIA_ORIGIN:$MEDIA_ORIGIN" \
    --var "LOCAL_ADMIN_BYPASS:false" \
    --var "LOCAL_SCREEN_BYPASS:false" \
    --var "LOCAL_TURNSTILE_TEST_MODE:false" \
    --var "STAMP_DAILY_LIMIT:$stamp_daily_limit" \
    --var "TURNSTILE_HOSTNAME:$turnstile_hostname"
else
  ./scripts/cloudflare-wrangler.sh --target production deploy \
    --env='' \
    --strict \
    --message "git:$release_sha" \
    --var "ACCESS_TEAM_DOMAIN:$ACCESS_TEAM_DOMAIN" \
    --var "ACCESS_AUD:$ACCESS_AUD" \
    --var "ADMIN_EMAILS:$ADMIN_EMAILS" \
    --var "SCREEN_ACCESS_AUD:$SCREEN_ACCESS_AUD" \
    --var "RELEASE_SHA:$release_sha" \
    --var "SCREEN_EMAILS:$SCREEN_EMAILS" \
    --var "MEDIA_ORIGIN:$MEDIA_ORIGIN" \
    --var "LOCAL_ADMIN_BYPASS:false" \
    --var "LOCAL_SCREEN_BYPASS:false" \
    --var "LOCAL_TURNSTILE_TEST_MODE:false" \
    --var "STAMP_DAILY_LIMIT:$stamp_daily_limit" \
    --var "TURNSTILE_HOSTNAME:$turnstile_hostname"
fi
