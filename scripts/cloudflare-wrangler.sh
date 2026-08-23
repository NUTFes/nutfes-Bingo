#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

set -a
. ./cloudflare.project.env
set +a

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <wrangler arguments...>" >&2
  exit 2
fi
if [ -z "${CLOUDFLARE_PRODUCTION_ACCOUNT_ID:-}" ]; then
  echo "CLOUDFLARE_PRODUCTION_ACCOUNT_ID must be set in cloudflare.project.env" >&2
  exit 2
fi

export CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_PRODUCTION_ACCOUNT_ID
exec pnpm exec wrangler "$@"
