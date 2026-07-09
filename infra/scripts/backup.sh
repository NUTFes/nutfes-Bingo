#!/bin/sh

set -eu
umask 077

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
env_file=${ENV_FILE:-$repo_root/.env.production}
backup_root=${1:-$repo_root/backups}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir=$backup_root/$timestamp

load_env_file() {
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      "" | \#*) continue ;;
      *=*) export "$line" ;;
      *)
        echo "Invalid env line in $env_file: $line" >&2
        exit 1
        ;;
    esac
  done <"$env_file"
}

compose() {
  ENV_FILE="$env_file" "$repo_root/infra/scripts/compose.sh" "$@"
}

load_env_file

mkdir -p "$backup_root"
if ! mkdir "$backup_dir"; then
  echo "Backup directory already exists: $backup_dir" >&2
  exit 1
fi

services_stopped=false
restart_services() {
  if [ "$services_stopped" = true ]; then
    compose up -d --wait >/dev/null
  fi
}
trap restart_services EXIT HUP INT TERM

compose stop cloudflared app kong auth rest storage >/dev/null
services_stopped=true

compose exec -T db pg_dump -U postgres -d postgres -Fc >"$backup_dir/postgres.dump"
compose exec -T db pg_dumpall -U postgres --globals-only >"$backup_dir/globals.sql"
compose exec -T db sh -ec 'cat /etc/postgresql-custom/pgsodium_root.key' >"$backup_dir/pgsodium_root.key"
compose run --rm --no-deps -T --entrypoint tar storage \
  -C /var/lib/storage -czf - . >"$backup_dir/storage.tar.gz"
compose images --format json >"$backup_dir/images.json"

restart_services
services_stopped=false

TIMESTAMP="$timestamp" \
BACKUP_DIR="$backup_dir" \
REPO_ROOT="$repo_root" \
APP_IMAGE="${APP_IMAGE:-unknown}" \
SUPABASE_POSTGRES_IMAGE="${SUPABASE_POSTGRES_IMAGE:-unknown}" \
CLOUDFLARED_IMAGE="${CLOUDFLARED_IMAGE:-unknown}" \
node <<'NODE'
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { readFileSync, readdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const repoRoot = process.env.REPO_ROOT;
const backupDir = process.env.BACKUP_DIR;

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const files = [
  "compose.prod.yml",
  "compose.cloudflare.yml",
  ".env.production.example",
  "infra/supabase/UPSTREAM.md",
];

for (const name of readdirSync(join(repoRoot, "supabase/migrations")).filter((name) => name.endsWith(".sql")).sort()) {
  files.push(`supabase/migrations/${name}`);
}

let images = "unknown";
try {
  const raw = readFileSync(join(backupDir, "images.json"), "utf8").trim();
  images = raw
    ? raw.split(/\r?\n/).filter(Boolean).map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return line;
        }
      })
    : [];
} catch {}

let migrationList = "unknown";
try {
  migrationList = execFileSync("pnpm", ["exec", "supabase", "migration", "list", "--local"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch {}

let gitCommit = "unknown";
try {
  gitCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {}

const manifest = {
  timestamp: process.env.TIMESTAMP,
  gitCommit,
  hashes: Object.fromEntries(files.map((file) => [file, sha256(join(repoRoot, file))])),
  images,
  env: {
    APP_IMAGE: process.env.APP_IMAGE,
    SUPABASE_POSTGRES_IMAGE: process.env.SUPABASE_POSTGRES_IMAGE,
    CLOUDFLARED_IMAGE: process.env.CLOUDFLARED_IMAGE,
  },
  supabaseMigrationList: migrationList,
};

writeFileSync(join(backupDir, "deployment-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
NODE

(
  cd "$backup_dir"
  sha256sum postgres.dump globals.sql pgsodium_root.key storage.tar.gz images.json deployment-manifest.json >SHA256SUMS
)

echo "Backup created at $backup_dir"
