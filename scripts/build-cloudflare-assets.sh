#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

site_url=${VITE_SITE_URL:-http://localhost:8787}
media_origin=${VITE_MEDIA_ORIGIN:-}
turnstile_site_key=${VITE_TURNSTILE_SITE_KEY:-}
case "$site_url" in
  http://*|https://*) ;;
  *)
    echo "VITE_SITE_URL must start with http:// or https://" >&2
    exit 2
    ;;
esac
if [ -z "$turnstile_site_key" ]; then
  case "$site_url" in
    http://localhost:*|http://127.0.0.1:*)
      turnstile_site_key=1x00000000000000000000AA
      ;;
    *)
      echo "VITE_TURNSTILE_SITE_KEY is required for a non-local build" >&2
      exit 2
      ;;
  esac
fi

artifact_dir=$(mktemp -d)
cleanup() {
  rm -rf "$artifact_dir"
}
trap cleanup EXIT HUP INT TERM

docker buildx build \
  --file Dockerfile.cloudflare \
  --target export \
  --build-arg "VITE_SITE_URL=$site_url" \
  --build-arg "VITE_MEDIA_ORIGIN=$media_origin" \
  --build-arg "VITE_TURNSTILE_SITE_KEY=$turnstile_site_key" \
  --build-arg "VITE_IMAGE_TRANSFORMATIONS=true" \
  --output "type=local,dest=$artifact_dir" \
  .

artifact_dist=$artifact_dir/dist
test -f "$artifact_dist/client/index.html"
test -f "$artifact_dist/client/404.html"
test -f "$artifact_dist/worker/wrangler.json"
ARTIFACT_DIST="$artifact_dist" node --input-type=module -e '
  import { readFileSync, realpathSync } from "node:fs";
  import { dirname, resolve } from "node:path";
  const dist = realpathSync(process.env.ARTIFACT_DIST);
  const configPath = resolve(dist, "worker/wrangler.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  for (const [name, value] of [["main", config.main], ["assets.directory", config.assets?.directory]]) {
    if (typeof value !== "string") throw new Error(`${name} is missing from generated Wrangler config`);
    const target = realpathSync(resolve(dirname(configPath), value));
    if (target !== dist && !target.startsWith(`${dist}/`)) throw new Error(`${name} escapes dist: ${value}`);
  }
'

rm -rf dist
mv "$artifact_dist" dist

echo "Client and Worker distribution exported to $repo_root/dist"
