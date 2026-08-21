#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

image=nutfes-bingo-cloudflare-dev
site_url=${NEXT_PUBLIC_SITE_URL:-http://localhost:8787}
media_origin=${NEXT_PUBLIC_MEDIA_ORIGIN:-}
turnstile_site_key=${NEXT_PUBLIC_TURNSTILE_SITE_KEY:-1x00000000000000000000AA}
set -- node node_modules/wrangler/bin/wrangler.js dev --ip 0.0.0.0 --port 8787 \
  --var LOCAL_ADMIN_BYPASS:true \
  --var LOCAL_SCREEN_BYPASS:true \
  --var LOCAL_TURNSTILE_TEST_MODE:true \
  --var TURNSTILE_HOSTNAME:localhost

docker build \
  --file Dockerfile.cloudflare \
  --target development \
  --build-arg "NEXT_PUBLIC_SITE_URL=$site_url" \
  --build-arg "NEXT_PUBLIC_MEDIA_ORIGIN=$media_origin" \
  --build-arg "NEXT_PUBLIC_TURNSTILE_SITE_KEY=$turnstile_site_key" \
  --tag "$image" \
  .

mkdir -p .wrangler

if [ -f .dev.vars ]; then
  exec docker run --rm -it --init \
    --publish 127.0.0.1:8787:8787 \
    --mount "type=bind,source=$repo_root/.wrangler,target=/app/.wrangler" \
    --mount "type=bind,source=$repo_root/.dev.vars,target=/app/.dev.vars,readonly" \
    "$image" "$@"
fi

echo "Warning: .dev.vars is absent; local Turnstile verification will fail closed." >&2
exec docker run --rm -it --init \
  --publish 127.0.0.1:8787:8787 \
  --mount "type=bind,source=$repo_root/.wrangler,target=/app/.wrangler" \
  "$image" "$@"
