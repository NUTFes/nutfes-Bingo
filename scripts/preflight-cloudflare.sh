#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

set -a
. ./cloudflare.project.env
if [ ! -f ./.cloudflare.deploy.production.env ]; then
  echo "Create .cloudflare.deploy.production.env from the production example first." >&2
  exit 2
fi
permissions=$(stat -c '%a' ./.cloudflare.deploy.production.env)
case "$permissions" in
  400|600) ;;
  *)
    echo ".cloudflare.deploy.production.env must have mode 400 or 600" >&2
    exit 2
    ;;
esac
. ./.cloudflare.deploy.production.env
set +a

ACCESS_TEAM_DOMAIN=$CLOUDFLARE_PRODUCTION_ACCESS_TEAM_DOMAIN
ACCESS_AUD=$CLOUDFLARE_PRODUCTION_ADMIN_AUD
SCREEN_ACCESS_AUD=$CLOUDFLARE_PRODUCTION_SCREEN_AUD
MEDIA_ORIGIN=$CLOUDFLARE_PRODUCTION_MEDIA_ORIGIN
VITE_TURNSTILE_SITE_KEY=$CLOUDFLARE_PRODUCTION_TURNSTILE_SITE_KEY
export ACCESS_TEAM_DOMAIN ACCESS_AUD SCREEN_ACCESS_AUD MEDIA_ORIGIN
export VITE_TURNSTILE_SITE_KEY

worktree_status=$(git status --porcelain --untracked-files=all)
if [ -n "$worktree_status" ]; then
  echo "Refusing release work from a dirty tree:" >&2
  printf '%s\n' "$worktree_status" >&2
  exit 2
fi
current_branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)
if [ "$current_branch" != "$CLOUDFLARE_RELEASE_BRANCH" ]; then
  echo "Deploys must run from $CLOUDFLARE_RELEASE_BRANCH" >&2
  exit 2
fi
expected_upstream=origin/$CLOUDFLARE_RELEASE_BRANCH
upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)
if [ "$upstream" != "$expected_upstream" ]; then
  echo "$CLOUDFLARE_RELEASE_BRANCH must track $expected_upstream" >&2
  exit 2
fi
git fetch --quiet origin "$CLOUDFLARE_RELEASE_BRANCH"
release_sha=$(git rev-parse HEAD)
remote_sha=$(git rev-parse "refs/remotes/$expected_upstream")
if [ "$release_sha" != "$remote_sha" ]; then
  echo "HEAD must be pushed and exactly match $expected_upstream" >&2
  exit 2
fi

: "${ADMIN_EMAILS:?Set ADMIN_EMAILS in the private deploy environment}"
: "${SCREEN_EMAILS:?Set SCREEN_EMAILS in the private deploy environment}"

node - <<'NODE'
const origins = {
  CLOUDFLARE_PRODUCTION_ACCESS_TEAM_DOMAIN: process.env.CLOUDFLARE_PRODUCTION_ACCESS_TEAM_DOMAIN,
  CLOUDFLARE_PRODUCTION_MEDIA_ORIGIN: process.env.CLOUDFLARE_PRODUCTION_MEDIA_ORIGIN,
  CLOUDFLARE_PRODUCTION_SITE_URL: process.env.CLOUDFLARE_PRODUCTION_SITE_URL,
};
for (const [name, value] of Object.entries(origins)) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error(`${name} must be an HTTPS origin`);
  }
}
if (!new URL(process.env.CLOUDFLARE_PRODUCTION_ACCESS_TEAM_DOMAIN).hostname.endsWith(".cloudflareaccess.com")) {
  throw new Error("The Access team domain is invalid");
}
if (process.env.CLOUDFLARE_PRODUCTION_WORKER !== "nutfes-bingo") {
  throw new Error("The configured production Worker name is invalid");
}
if (process.env.CLOUDFLARE_RELEASE_BRANCH !== "develop") {
  throw new Error("develop must be the only deployment source");
}
if (process.env.CLOUDFLARE_PRODUCTION_ADMIN_AUD === process.env.CLOUDFLARE_PRODUCTION_SCREEN_AUD) {
  throw new Error("Admin and Screen must use separate Access applications");
}
const testKeys = new Set([
  "1x00000000000000000000AA",
  "2x00000000000000000000AB",
  "1x00000000000000000000BB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF",
]);
if (testKeys.has(process.env.CLOUDFLARE_PRODUCTION_TURNSTILE_SITE_KEY)) {
  throw new Error("A Turnstile test sitekey cannot be deployed");
}
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
for (const [name, maximum] of [["ADMIN_EMAILS", 20], ["SCREEN_EMAILS", 10]]) {
  const emails = JSON.parse(process.env[name]);
  if (
    !Array.isArray(emails) ||
    emails.length < 1 ||
    emails.length > maximum ||
    emails.some(
      (email) =>
        typeof email !== "string" ||
        email !== email.trim().toLowerCase() ||
        !emailPattern.test(email),
    ) ||
    new Set(emails).size !== emails.length
  ) {
    throw new Error(`${name} must contain unique lowercase named users`);
  }
}
const stampLimit = Number(process.env.STAMP_DAILY_LIMIT ?? "25000");
if (!Number.isSafeInteger(stampLimit) || stampLimit < 0 || stampLimit > 25_000) {
  throw new Error("STAMP_DAILY_LIMIT must be an integer from 0 to 25000");
}
NODE

./scripts/check-cloudflare-operator.sh
secrets_json=$(./scripts/cloudflare-wrangler.sh secret list --env='' --format json)
SECRETS_JSON=$secrets_json node -e '
  const secrets = JSON.parse(process.env.SECRETS_JSON);
  if (!Array.isArray(secrets) || !secrets.some((secret) => secret?.name === "TURNSTILE_SECRET_KEY")) {
    throw new Error("TURNSTILE_SECRET_KEY is not registered on the production Worker");
  }
'
bucket_json=$(./scripts/cloudflare-wrangler.sh r2 bucket info nutfes-bingo-prize-images --json)
BUCKET_JSON=$bucket_json node -e '
  const bucket = JSON.parse(process.env.BUCKET_JSON);
  if (bucket?.name !== "nutfes-bingo-prize-images") {
    throw new Error("The pinned production prize image bucket is missing");
  }
'

pnpm run secrets:check
pnpm audit --prod --audit-level high
pnpm audit --audit-level high
pnpm run check
pnpm run test
pnpm run doctor
pnpm run knip
./scripts/check-cloudflare-worker.sh

echo "Preflight passed for git:$release_sha and the pinned production account/resources."
