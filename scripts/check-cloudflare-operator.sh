#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

set -a
. ./cloudflare.project.env
set +a

target=
require_r2=false
while [ "$#" -gt 0 ]; do
  case "$1" in
    --env)
      if [ "$#" -lt 2 ]; then
        echo "Usage: $0 --env production|staging [--require-r2]" >&2
        exit 2
      fi
      target=$2
      shift 2
      ;;
    --require-r2)
      require_r2=true
      shift
      ;;
    --help)
      echo "Usage: $0 --env production|staging [--require-r2]"
      exit 0
      ;;
    *)
      echo "Usage: $0 --env production|staging [--require-r2]" >&2
      exit 2
      ;;
  esac
done

case "$target" in
  production)
    account_id=${CLOUDFLARE_PRODUCTION_ACCOUNT_ID:-}
    shared_owner_email=${CLOUDFLARE_PRODUCTION_ACCOUNT_OWNER_EMAIL:-}
    ;;
  staging)
    account_id=${CLOUDFLARE_STAGING_ACCOUNT_ID:-}
    shared_owner_email=
    ;;
  *)
    echo "Usage: $0 --env production|staging [--require-r2]" >&2
    exit 2
    ;;
esac
if [ "$target" = "production" ] && [ -z "$shared_owner_email" ]; then
  echo "CLOUDFLARE_PRODUCTION_ACCOUNT_OWNER_EMAIL must be set in cloudflare.project.env" >&2
  exit 2
fi


whoami_json=$(./scripts/cloudflare-wrangler.sh --target "$target" whoami --json)
WHOAMI_JSON=$whoami_json \
  EXPECTED_ACCOUNT_ID=$account_id \
  SHARED_OWNER_EMAIL=$shared_owner_email \
  TARGET=$target \
  node - <<'NODE'
const result = JSON.parse(process.env.WHOAMI_JSON);
const accountId = process.env.EXPECTED_ACCOUNT_ID;

if (result.loggedIn !== true) {
  console.error("Wrangler is not authenticated");
  process.exit(2);
}
if (typeof result.email !== "string" || !result.email.includes("@")) {
  console.error("Remote operations require a named Wrangler user login, not an anonymous API token");
  process.exit(2);
}
if (!Array.isArray(result.accounts) || !result.accounts.some((account) => account?.id === accountId)) {
  console.error(`Wrangler operator is not a member of the required Cloudflare account: ${accountId}`);
  process.exit(2);
}
if (
  process.env.TARGET === "production" &&
  typeof result.email === "string" &&
  result.email.toLowerCase() === process.env.SHARED_OWNER_EMAIL?.toLowerCase()
) {
  console.error(
    "Production operations require an invited named Cloudflare member, not the shared account owner login",
  );
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
  ./scripts/cloudflare-wrangler.sh --target "$target" r2 bucket list >/dev/null
fi

echo "Cloudflare $target operator account and required capabilities verified."
