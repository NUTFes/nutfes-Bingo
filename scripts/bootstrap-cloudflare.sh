#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

./scripts/check-cloudflare-operator.sh --require-r2

target=production
if [ "${1:-}" = "--env" ] && [ -n "${2:-}" ]; then
  target=$2
  shift 2
fi
if [ "$#" -ne 0 ]; then
  echo "Usage: $0 [--env production|staging|all]" >&2
  exit 2
fi

ensure_bucket() {
  bucket=$1
  if ./scripts/cloudflare-wrangler.sh r2 bucket info "$bucket" >/dev/null 2>&1; then
    echo "R2 bucket already exists: $bucket"
    return
  fi

  # Bindings are already declared in wrangler.jsonc. Prevent Wrangler from
  # prompting to append a second binding after creating the remote bucket.
  ./scripts/cloudflare-wrangler.sh r2 bucket create "$bucket" --update-config=false
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
  all)
    ensure_bucket nutfes-bingo-prize-images
    ensure_bucket nutfes-bingo-backups
    ensure_bucket nutfes-bingo-prize-images-staging
    ensure_bucket nutfes-bingo-backups-staging
    ;;
  *)
    echo "Unknown environment: $target (expected production, staging, or all)" >&2
    exit 2
    ;;
esac
