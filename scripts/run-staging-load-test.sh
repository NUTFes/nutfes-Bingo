#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

set -a
. ./cloudflare.project.env
set +a

release_sha=$(git rev-parse HEAD)

exec pnpm run load:cloudflare -- \
  --run \
  --allow-remote \
  --base-url "$CLOUDFLARE_STAGING_SITE_URL" \
  --environment staging \
  --source-release-sha "$release_sha" \
  --scenario single-egress-diagnostic \
  --state-ws 1000 \
  --duration 300 \
  --expect-broadcasts 5 \
  --output .cloudflare/deployments/staging-load-diagnostic.json
