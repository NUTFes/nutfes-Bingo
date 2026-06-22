#!/bin/sh

set -eu

app_url=${1:?Usage: smoke-test.sh https://app.example.com https://supabase.example.com}
supabase_url=${2:?Usage: smoke-test.sh https://app.example.com https://supabase.example.com}
app_url=${app_url%/}
supabase_url=${supabase_url%/}

curl_cmd() {
  if [ "${SMOKE_TEST_INSECURE:-}" = "1" ]; then
    curl --insecure "$@"
  else
    curl "$@"
  fi
}

curl_cmd --fail --silent --show-error "$app_url/api/health" >/dev/null
curl_cmd --fail --silent --show-error "$app_url/api/ready" >/dev/null
curl_cmd --fail --silent --show-error \
  "$supabase_url/auth/v1/settings" \
  -H "apikey: ${SUPABASE_PUBLISHABLE_KEY:?SUPABASE_PUBLISHABLE_KEY is required}" >/dev/null
curl_cmd --fail --silent --show-error \
  "$supabase_url/rest/v1/" \
  -H "apikey: ${SUPABASE_PUBLISHABLE_KEY:?SUPABASE_PUBLISHABLE_KEY is required}" >/dev/null
curl_cmd --fail --silent --show-error \
  "$supabase_url/storage/v1/status" \
  -H "apikey: ${SUPABASE_PUBLISHABLE_KEY:?SUPABASE_PUBLISHABLE_KEY is required}" >/dev/null

echo "Smoke test passed for $app_url and $supabase_url"
