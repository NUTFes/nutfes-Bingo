#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
env_file=${ENV_FILE:-$repo_root/.env.production}
backup_dir=${1:-}

if [ -z "$backup_dir" ] || [ ! -d "$backup_dir" ]; then
  echo "Usage: CONFIRM_RESTORE=restore-nutfes-bingo $0 BACKUP_DIRECTORY" >&2
  exit 2
fi

if [ "${CONFIRM_RESTORE:-}" != "restore-nutfes-bingo" ]; then
  echo "Set CONFIRM_RESTORE=restore-nutfes-bingo to confirm destructive restore" >&2
  exit 2
fi

for file in postgres.dump storage.tar.gz SHA256SUMS; do
  if [ ! -f "$backup_dir/$file" ]; then
    echo "Missing backup artifact: $file" >&2
    exit 1
  fi
done

(
  cd "$backup_dir"
  sha256sum -c SHA256SUMS
)

compose() {
  ENV_FILE="$env_file" "$repo_root/infra/scripts/compose.sh" "$@"
}

acl_list=$(mktemp)
trap 'rm -f "$acl_list"' EXIT HUP INT TERM

compose exec -T db pg_restore -l <"$backup_dir/postgres.dump" \
  | awk '/^[0-9]+;.* ACL / && $0 !~ /ACL graphql_public FUNCTION graphql/ { print }' \
  >"$acl_list"

compose stop cloudflared app kong auth rest storage >/dev/null
compose exec -T db dropdb -U supabase_admin --force postgres
compose exec -T db createdb -U supabase_admin -O postgres postgres
compose exec -T db pg_restore -U supabase_admin -d postgres --no-privileges --exit-on-error \
  <"$backup_dir/postgres.dump"
compose cp "$acl_list" db:/tmp/nutfes-bingo-restore-acl.list >/dev/null
compose exec -T db pg_restore -U supabase_admin -d postgres --exit-on-error \
  --use-list=/tmp/nutfes-bingo-restore-acl.list <"$backup_dir/postgres.dump"
compose exec -T db rm -f /tmp/nutfes-bingo-restore-acl.list

compose run --rm --no-deps -T --entrypoint sh storage -ec '
  find /var/lib/storage -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
  tar -C /var/lib/storage -xzf -
' <"$backup_dir/storage.tar.gz"

compose rm -sf migrate >/dev/null 2>&1 || true
compose up -d --wait

echo "Restore completed from $backup_dir"
