#!/bin/sh

set -eu

missing=""
for name in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_TUNNEL_ID NEXT_PUBLIC_SITE_URL; do
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    missing=$name
    break
  fi
done

if [ -n "$missing" ]; then
  echo "Cloudflare API verification skipped: missing $missing" >&2
  exit 2
fi

case "$NEXT_PUBLIC_SITE_URL" in
  https://*) app_host=${NEXT_PUBLIC_SITE_URL#https://} ;;
  http://*) app_host=${NEXT_PUBLIC_SITE_URL#http://} ;;
  *) echo "NEXT_PUBLIC_SITE_URL must be an http(s) URL" >&2; exit 1 ;;
esac
app_host=${app_host%%/*}
app_host=${app_host%%:*}

response_file=$(mktemp)
trap 'rm -f "$response_file"' EXIT HUP INT TERM

curl --fail --silent --show-error \
  --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  --header "Content-Type: application/json" \
  --output "$response_file" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/cfd_tunnel/$CLOUDFLARE_TUNNEL_ID/configurations"

node - "$app_host" "$response_file" <<'NODE'
const { readFileSync } = require("node:fs");
const host = process.argv[2];
const responseFile = process.argv[3];
let payload;
try {
  payload = JSON.parse(readFileSync(responseFile, "utf8"));
} catch (error) {
  console.error(`Cloudflare API verification failed: invalid JSON: ${error.message}`);
  process.exit(1);
}

if (payload.success !== true) {
  console.error("Cloudflare API verification failed: API success flag is false");
  process.exit(1);
}

const ingress = payload.result?.config?.ingress ?? [];
const publicHostnames = ingress.filter((entry) => typeof entry.hostname === "string" && entry.hostname.length > 0);
const matches = publicHostnames.filter((entry) => entry.hostname === host);

if (matches.length !== 1) {
  console.error(`Cloudflare API verification failed: expected exactly one public hostname for ${host}, got ${matches.length}`);
  process.exit(1);
}

if (matches[0].service !== "http://app:3000") {
  console.error(`Cloudflare API verification failed: ${host} service must be http://app:3000`);
  process.exit(1);
}

const forbidden = publicHostnames.filter((entry) => entry.hostname !== host && /(^|\/)(auth\/v1|rest\/v1|storage\/v1)/.test(entry.path ?? ""));
if (forbidden.length > 0) {
  console.error("Cloudflare API verification failed: auth/rest/storage paths must not have separate public hostnames");
  process.exit(1);
}

console.log(`Cloudflare tunnel check passed for ${host} -> http://app:3000`);
NODE
