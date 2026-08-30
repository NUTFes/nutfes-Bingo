#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

if [ "$#" -ne 0 ]; then
  echo "Usage: $0" >&2
  exit 2
fi

pnpm build
generated_config=dist/nutfes_bingo/wrangler.json
test -f "$generated_config"
test -f dist/client/index.html

# These checks are local-only. Remote commands use the account-pinned wrapper.
unset CLOUDFLARE_ACCOUNT_ID
pnpm exec wrangler types --strict-vars=false --check

rm -rf .wrangler-dist
pnpm exec wrangler deploy \
  --config "$generated_config" \
  --env='' \
  --dry-run \
  --outdir .wrangler-dist
node scripts/check-worker-bundle-size.mjs .wrangler-dist

pnpm exec wrangler check startup \
  --config "$generated_config" \
  --env='' \
  --outfile .wrangler-dist/worker-startup.cpuprofile
