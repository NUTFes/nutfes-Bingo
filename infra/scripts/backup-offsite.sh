#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
backup_root=${1:-$repo_root/backups}

if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone is required for offsite backups" >&2
  exit 1
fi

if [ -z "${REMOTE_BACKUP_TARGET:-}" ]; then
  echo "REMOTE_BACKUP_TARGET is required for offsite backups" >&2
  exit 1
fi

output=$("$repo_root/infra/scripts/backup.sh" "$backup_root")
printf '%s\n' "$output"
backup_dir=$(printf '%s\n' "$output" | sed -n 's/^Backup created at //p' | tail -n 1)

if [ -z "$backup_dir" ] || [ ! -d "$backup_dir" ]; then
  echo "Could not determine created backup directory" >&2
  exit 1
fi

timestamp=$(basename -- "$backup_dir")
rclone copy "$backup_dir" "$REMOTE_BACKUP_TARGET/$timestamp" --checksum

echo "Offsite backup copied to $REMOTE_BACKUP_TARGET/$timestamp"
