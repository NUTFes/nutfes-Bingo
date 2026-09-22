#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

if [ "$#" -ne 0 ]; then
  echo "Usage: $0" >&2
  exit 2
fi

./scripts/check-cloudflare-operator.sh
exec node scripts/cloudflare-smoke.mjs
