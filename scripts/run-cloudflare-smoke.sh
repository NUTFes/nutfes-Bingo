#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

set -a
. ./cloudflare.project.env
set +a

if [ "$#" -lt 2 ] || [ "$1" != "--env" ] ||
  { [ "$2" != "production" ] && [ "$2" != "staging" ]; }; then
  echo "Usage: $0 --env production|staging [--output path]" >&2
  exit 2
fi

./scripts/check-cloudflare-operator.sh --env "$2"
exec node scripts/cloudflare-smoke.mjs "$@"
