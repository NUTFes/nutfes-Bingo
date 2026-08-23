#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

set -a
. ./cloudflare.project.env
set +a

if [ "$#" -ne 0 ]; then
  echo "Usage: $0" >&2
  exit 2
fi

account_id=${CLOUDFLARE_PRODUCTION_ACCOUNT_ID:-}
shared_owner_email=${CLOUDFLARE_PRODUCTION_ACCOUNT_OWNER_EMAIL:-}
if [ -z "$account_id" ] || [ -z "$shared_owner_email" ]; then
  echo "Production account ID and owner email must be set in cloudflare.project.env" >&2
  exit 2
fi

whoami_json=$(./scripts/cloudflare-wrangler.sh whoami --json)
WHOAMI_JSON=$whoami_json \
  EXPECTED_ACCOUNT_ID=$account_id \
  SHARED_OWNER_EMAIL=$shared_owner_email \
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


echo "Cloudflare production operator account and required capabilities verified."
