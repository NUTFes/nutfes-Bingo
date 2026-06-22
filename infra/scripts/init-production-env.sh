#!/bin/sh

set -eu
umask 077

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
target=${1:-$repo_root/.env.production}

if [ -e "$target" ]; then
  echo "$target already exists; refusing to overwrite it" >&2
  exit 1
fi

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT HUP INT TERM

cp "$repo_root/.env.production.example" "$tmpdir/.env"
cp "$repo_root/compose.prod.yml" "$tmpdir/docker-compose.yml"

(
  cd "$tmpdir"
  sh "$repo_root/infra/supabase/utils/generate-keys.sh" --update-env >/dev/null
  sh "$repo_root/infra/supabase/utils/add-new-auth-keys.sh" --update-env >/dev/null
)

salt=$(openssl rand -hex 32)
sed -i -e "s|^NUTFES_PUBLIC_ACTION_HASH_SALT=.*$|NUTFES_PUBLIC_ACTION_HASH_SALT=$salt|" "$tmpdir/.env"

mkdir -p "$(dirname -- "$target")"
cp "$tmpdir/.env" "$target"
chmod 600 "$target"

echo "Created $target with mode 0600. Set app/Supabase URLs, Cloudflare Tunnel token, and persistent data paths before deployment."
