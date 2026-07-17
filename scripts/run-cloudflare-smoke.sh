#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

set -a
. ./cloudflare.project.env
set +a

./scripts/check-cloudflare-operator.sh
exec node scripts/cloudflare-smoke.mjs "$@"
