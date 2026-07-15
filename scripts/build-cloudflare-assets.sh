#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

site_url=${NEXT_PUBLIC_SITE_URL:-http://localhost:8787}
media_origin=${NEXT_PUBLIC_MEDIA_ORIGIN:-}
turnstile_site_key=${NEXT_PUBLIC_TURNSTILE_SITE_KEY:-}
case "$site_url" in
  http://*|https://*) ;;
  *)
    echo "NEXT_PUBLIC_SITE_URL must start with http:// or https://" >&2
    exit 2
    ;;
esac
if [ -z "$turnstile_site_key" ]; then
  case "$site_url" in
    http://localhost:*|http://127.0.0.1:*)
      turnstile_site_key=1x00000000000000000000AA
      ;;
    *)
      echo "NEXT_PUBLIC_TURNSTILE_SITE_KEY is required for a non-local build" >&2
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
  --build-arg "NEXT_PUBLIC_SITE_URL=$site_url" \
  --build-arg "NEXT_PUBLIC_MEDIA_ORIGIN=$media_origin" \
  --build-arg "NEXT_PUBLIC_TURNSTILE_SITE_KEY=$turnstile_site_key" \
  --output "type=local,dest=$artifact_dir" \
  .

test -f "$artifact_dir/out/index.html"
rm -rf out
mv "$artifact_dir/out" out

echo "Static artifact exported to $repo_root/out"
