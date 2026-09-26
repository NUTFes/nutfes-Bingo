#!/bin/sh
set -eu

repo_root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

usage() {
  echo "Usage: $0 [--preview|--test]" >&2
  exit 2
}

mode=development
case "$#" in
  0) ;;
  1)
    case "$1" in
      --preview) mode=preview ;;
      --test) mode="test" ;;
      *) usage ;;
    esac
    ;;
  *) usage ;;
esac

site_url=${VITE_SITE_URL:-http://localhost:8787}
media_origin=${VITE_MEDIA_ORIGIN:-}
turnstile_site_key=${VITE_TURNSTILE_SITE_KEY:-1x00000000000000000000AA}
use_polling=${VITE_USE_POLLING:-false}
turnstile_secret_key=1x0000000000000000000000000000000AA
port=8787
if [ "$mode" = test ]; then
  # Tests must never inherit production URLs/keys or touch developer event data.
  port=8788
  site_url=http://localhost:8788
  media_origin=
  turnstile_site_key=1x00000000000000000000AA
else
  mkdir -p .wrangler
fi

if [ "$mode" != development ]; then
  image=nutfes-bingo-cloudflare-preview
  docker build \
    --file Dockerfile.cloudflare \
    --target preview \
    --build-arg "VITE_SITE_URL=$site_url" \
    --build-arg "VITE_MEDIA_ORIGIN=$media_origin" \
    --build-arg "VITE_TURNSTILE_SITE_KEY=$turnstile_site_key" \
    --build-arg "VITE_IMAGE_TRANSFORMATIONS=true" \
    --tag "$image" \
    .

  if [ "$mode" = test ]; then
    container="nutfes-bingo-browser-$$"
    trap 'docker stop "$container" >/dev/null 2>&1 || true' EXIT
    trap 'exit 130' INT
    trap 'exit 143' TERM
    set -- --name "$container" \
      --tmpfs /app/.wrangler:uid=1000,gid=1000,mode=0700 \
      --tmpfs /app/node_modules/.mf:uid=1000,gid=1000,mode=0700
  else
    set -- -it --mount "type=bind,source=$repo_root/.wrangler,target=/app/.wrangler"
  fi

  set -- docker run --rm --init "$@" \
    --publish "127.0.0.1:$port:$port" \
    "$image" \
    node node_modules/wrangler/bin/wrangler.js dev \
      --config dist/worker/wrangler.json \
      --ip 0.0.0.0 \
      --port "$port" \
      --var LOCAL_ADMIN_BYPASS:true \
      --var LOCAL_SCREEN_BYPASS:true \
      --var LOCAL_TURNSTILE_TEST_MODE:true \
      --var TURNSTILE_HOSTNAME:localhost \
      --var "TURNSTILE_SECRET_KEY:$turnstile_secret_key"
  if [ "$mode" = test ]; then
    "$@" &
    wait "$!"
    exit
  fi
  exec "$@"
fi

image=nutfes-bingo-cloudflare-dev
docker build \
  --file Dockerfile.cloudflare \
  --target development \
  --tag "$image" \
  .

exec docker run --rm -it --init \
  --publish 127.0.0.1:8787:8787 \
  --env BINGO_LOCAL_DEV=true \
  --env "VITE_SITE_URL=$site_url" \
  --env "VITE_MEDIA_ORIGIN=$media_origin" \
  --env "VITE_TURNSTILE_SITE_KEY=$turnstile_site_key" \
  --env VITE_IMAGE_TRANSFORMATIONS=false \
  --env "VITE_USE_POLLING=$use_polling" \
  --env "TURNSTILE_SECRET_KEY=$turnstile_secret_key" \
  --mount "type=bind,source=$repo_root,target=/app" \
  --volume /app/node_modules \
  "$image"
