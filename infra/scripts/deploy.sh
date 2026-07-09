#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
compose="$repo_root/infra/scripts/compose.sh"

# `migrate` is a one-shot service. If a previous successful container remains,
# Compose can treat the dependency as already satisfied and skip new migrations.
"$compose" rm -sf migrate >/dev/null 2>&1 || true
"$compose" up -d --wait --remove-orphans
