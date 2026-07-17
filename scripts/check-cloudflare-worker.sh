#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

target=production
if [ "${1:-}" = "--env" ] && [ -n "${2:-}" ]; then
  target=$2
  shift 2
fi
if [ "$#" -ne 0 ] || { [ "$target" != "production" ] && [ "$target" != "staging" ]; }; then
  echo "Usage: $0 [--env production|staging]" >&2
  exit 2
fi

if [ "$target" = "staging" ]; then
  wrangler_env=staging
else
  wrangler_env=
fi

./scripts/build-cloudflare-assets.sh
./scripts/cloudflare-wrangler.sh types --strict-vars=false --check

rm -rf .wrangler-dist
./scripts/cloudflare-wrangler.sh deploy \
  --env="$wrangler_env" \
  --dry-run \
  --minify \
  --outdir .wrangler-dist
node scripts/check-worker-bundle-size.mjs .wrangler-dist

./scripts/cloudflare-wrangler.sh check startup \
  --env="$wrangler_env" \
  --outfile .wrangler-dist/worker-startup.cpuprofile
