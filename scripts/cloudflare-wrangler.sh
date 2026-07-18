#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

set -a
. ./cloudflare.project.env
set +a

if [ "$#" -lt 3 ] || [ "$1" != "--target" ]; then
  echo "Usage: $0 --target production|staging <wrangler arguments...>" >&2
  exit 2
fi
target=$2
shift 2

case "$target" in
  production)
    account_id_name=CLOUDFLARE_PRODUCTION_ACCOUNT_ID
    account_id=${CLOUDFLARE_PRODUCTION_ACCOUNT_ID:-}
    ;;
  staging)
    account_id_name=CLOUDFLARE_STAGING_ACCOUNT_ID
    account_id=${CLOUDFLARE_STAGING_ACCOUNT_ID:-}
    ;;
  *)
    echo "Unknown target: $target (expected production or staging)" >&2
    exit 2
    ;;
esac

if [ -z "$account_id" ]; then
  echo "$account_id_name must be set in cloudflare.project.env" >&2
  exit 2
fi

export CLOUDFLARE_ACCOUNT_ID=$account_id
exec pnpm exec wrangler "$@"
