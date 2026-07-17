#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

set -a
. ./cloudflare.project.env
set +a

: "${CLOUDFLARE_ACCOUNT_ID:?cloudflare.project.env must define CLOUDFLARE_ACCOUNT_ID}"

exec pnpm exec wrangler "$@"
