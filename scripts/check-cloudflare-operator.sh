#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

set -a
. ./cloudflare.project.env
set +a

require_r2=false
case "${1:-}" in
  "") ;;
  --require-r2)
    require_r2=true
    ;;
  --help)
    echo "Usage: $0 [--require-r2]"
    exit 0
    ;;
  *)
    echo "Usage: $0 [--require-r2]" >&2
    exit 2
    ;;
esac

whoami_json=$(./scripts/cloudflare-wrangler.sh whoami --json)
WHOAMI_JSON=$whoami_json node - <<'NODE'
const result = JSON.parse(process.env.WHOAMI_JSON);
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

if (result.loggedIn !== true) {
  console.error("Wrangler is not authenticated");
  process.exit(2);
}
if (!Array.isArray(result.accounts) || !result.accounts.some((account) => account?.id === accountId)) {
  console.error(`Wrangler operator is not a member of the required Cloudflare account: ${accountId}`);
  process.exit(2);
}

const permissions = Array.isArray(result.tokenPermissions) ? result.tokenPermissions : [];
const hasWorkerWrite = permissions.some((value) => {
  const permission = String(value).toLowerCase();
  return (
    permission === "workers:write" ||
    permission === "workers_scripts:write" ||
    (permission.includes("workers scripts") &&
      (permission.includes("write") || permission.includes("edit")))
  );
});
if (!hasWorkerWrite) {
  console.error("Wrangler token must expose Workers Scripts write permission");
  process.exit(2);
}
NODE

if [ "$require_r2" = true ]; then
  ./scripts/cloudflare-wrangler.sh r2 bucket list >/dev/null
fi

echo "Cloudflare operator account and required capabilities verified."
