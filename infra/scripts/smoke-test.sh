#!/bin/sh

set -eu

base_url=${1:?Usage: smoke-test.sh https://bingo.example.com}
base_url=${base_url%/}

curl --fail --silent --show-error "$base_url/api/health" >/dev/null
curl --fail --silent --show-error "$base_url/api/ready" >/dev/null
curl --fail --silent --show-error \
  "$base_url/supabase/auth/v1/settings" \
  -H "apikey: ${SUPABASE_PUBLISHABLE_KEY:?SUPABASE_PUBLISHABLE_KEY is required}" >/dev/null

blocked_status=$(curl --silent --output /dev/null --write-out '%{http_code}' \
  "$base_url/supabase/rest/v1/")

if [ "$blocked_status" != "404" ]; then
  echo "Expected public PostgREST path to return 404, got $blocked_status" >&2
  exit 1
fi

echo "Smoke test passed for $base_url"
