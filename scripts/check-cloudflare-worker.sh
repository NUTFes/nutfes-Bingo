#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

./scripts/build-cloudflare-assets.sh
pnpm exec wrangler types --strict-vars=false --check

rm -rf .wrangler-dist
pnpm exec wrangler deploy --env='' --dry-run --minify --outdir .wrangler-dist
node scripts/check-worker-bundle-size.mjs .wrangler-dist

pnpm exec wrangler check startup \
  --env='' \
  --outfile .wrangler-dist/worker-startup.cpuprofile
