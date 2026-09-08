#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

if [ "$#" -ne 0 ]; then
  echo "Usage: $0" >&2
  exit 2
fi

./scripts/build-cloudflare-assets.sh

# These checks are local-only. Avoid any ambient account override.
unset CLOUDFLARE_ACCOUNT_ID
pnpm run worker:types:check

rm -rf .wrangler-dist
pnpm run worker:dry-run
pnpm run worker:bundle:check

pnpm exec wrangler check startup \
  --config dist/worker/wrangler.json \
  --env='' \
  --args='--config dist/worker/wrangler.json' \
  --outfile .wrangler-dist/worker-startup.cpuprofile
