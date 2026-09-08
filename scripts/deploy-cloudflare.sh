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

node --input-type=module - <<'NODE'
import { unstable_readConfig } from "wrangler";

const source = unstable_readConfig({ config: "./wrangler.jsonc" });
const generated = unstable_readConfig({ config: "./dist/worker/wrangler.json" });
for (const key of ["LOCAL_ADMIN_BYPASS", "LOCAL_SCREEN_BYPASS", "LOCAL_TURNSTILE_TEST_MODE"]) {
  if (generated.vars?.[key] !== "false") throw new Error(`Generated ${key} must be false`);
}
const contractKeys = ["name", "account_id", "workers_dev", "preview_urls", "compatibility_date", "compatibility_flags", "durable_objects", "migrations", "r2_buckets"];
for (const key of contractKeys) {
  if (JSON.stringify(generated[key]) !== JSON.stringify(source[key])) {
    throw new Error(`Generated Wrangler config differs from source for ${key}`);
  }
}
for (const key of ["binding", "html_handling", "not_found_handling", "run_worker_first"]) {
  if (JSON.stringify(generated.assets?.[key]) !== JSON.stringify(source.assets?.[key])) {
    throw new Error(`Generated assets.${key} differs from source`);
  }
}
NODE

pnpm exec wrangler deploy \
  --config dist/worker/wrangler.json \
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
