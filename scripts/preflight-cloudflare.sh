#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

set -a
. ./cloudflare.production.env
set +a
release_branch=develop

VITE_SITE_URL=$CLOUDFLARE_PRODUCTION_SITE_URL
VITE_MEDIA_ORIGIN=$CLOUDFLARE_PRODUCTION_MEDIA_ORIGIN
VITE_TURNSTILE_SITE_KEY=$CLOUDFLARE_PRODUCTION_TURNSTILE_SITE_KEY
VITE_IMAGE_TRANSFORMATIONS=true
export VITE_SITE_URL VITE_MEDIA_ORIGIN VITE_TURNSTILE_SITE_KEY VITE_IMAGE_TRANSFORMATIONS

worktree_status=$(git status --porcelain --untracked-files=all)
if [ -n "$worktree_status" ]; then
  echo "Refusing release work from a dirty tree:" >&2
  printf '%s\n' "$worktree_status" >&2
  exit 2
fi
current_branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)
if [ "$current_branch" != "$release_branch" ]; then
  echo "Deploys must run from $release_branch" >&2
  exit 2
fi
expected_upstream=origin/$release_branch
upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)
if [ "$upstream" != "$expected_upstream" ]; then
  echo "$release_branch must track $expected_upstream" >&2
  exit 2
fi
git fetch --quiet origin "$release_branch"
release_sha=$(git rev-parse HEAD)
remote_sha=$(git rev-parse "refs/remotes/$expected_upstream")
if [ "$release_sha" != "$remote_sha" ]; then
  echo "HEAD must be pushed and exactly match $expected_upstream" >&2
  exit 2
fi

node --input-type=module - <<'NODE'
import { unstable_readConfig } from "wrangler";

const wranglerConfig = unstable_readConfig({ config: "./wrangler.jsonc" });
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
if (wranglerConfig.name !== "nutfes-bingo") {
  throw new Error("wrangler.jsonc must target the nutfes-bingo Worker");
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
NODE

./scripts/check-cloudflare-operator.sh
secrets_json=$(pnpm exec wrangler secret list --config wrangler.jsonc --env='' --format json)
SECRETS_JSON=$secrets_json node -e '
  const secrets = JSON.parse(process.env.SECRETS_JSON);
  if (!Array.isArray(secrets) || !secrets.some((secret) => secret?.name === "TURNSTILE_SECRET_KEY")) {
    throw new Error("TURNSTILE_SECRET_KEY is not registered on the production Worker");
  }
'
bucket_json=$(pnpm exec wrangler r2 bucket info nutfes-bingo-prize-images --config wrangler.jsonc --json)
BUCKET_JSON=$bucket_json node -e '
  const bucket = JSON.parse(process.env.BUCKET_JSON);
  if (bucket?.name !== "nutfes-bingo-prize-images") {
    throw new Error("The pinned production prize image bucket is missing");
  }
'

pnpm run secrets:check
audit_status=0
timeout --kill-after=5s 60s \
  pnpm --registry=https://registry.npmjs.org/ audit --audit-level high --ignore-registry-errors \
  || audit_status=$?
case "$audit_status" in
  0) ;;
  124|137)
    echo "WARN: npm advisory API timed out; continuing because registry errors are configured to be ignored." >&2
    ;;
  *) exit "$audit_status" ;;
esac
pnpm run check
pnpm run test
pnpm run doctor
pnpm run knip
./scripts/check-cloudflare-worker.sh

echo "Preflight passed for git:$release_sha and the pinned production account/resources."
