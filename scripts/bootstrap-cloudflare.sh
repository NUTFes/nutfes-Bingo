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

./scripts/check-cloudflare-operator.sh --env "$target" --require-r2

ensure_bucket() {
  bucket=$1
  if ./scripts/cloudflare-wrangler.sh --target "$target" r2 bucket info "$bucket" \
    >/dev/null 2>&1; then
    echo "R2 bucket already exists: $bucket"
    return
  fi

  # Bindings are already declared in wrangler.jsonc. Prevent Wrangler from
  # prompting to append a second binding after creating the remote bucket.
  ./scripts/cloudflare-wrangler.sh --target "$target" \
    r2 bucket create "$bucket" --update-config=false
}

case "$target" in
  production)
    ensure_bucket nutfes-bingo-prize-images
    ensure_bucket nutfes-bingo-backups
    ;;
  staging)
    ensure_bucket nutfes-bingo-prize-images-staging
    ensure_bucket nutfes-bingo-backups-staging
    ;;
esac
