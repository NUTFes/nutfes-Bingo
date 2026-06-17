#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)

"$repo_root/infra/scripts/compose.sh" up -d --build --wait
