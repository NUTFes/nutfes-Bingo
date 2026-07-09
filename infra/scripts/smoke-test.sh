#!/bin/sh

set -eu

app_url=${1:?Usage: smoke-test.sh https://app.example.com}
app_url=${app_url%/}

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT HUP INT TERM

curl_cmd() {
  if [ "${SMOKE_TEST_INSECURE:-}" = "1" ]; then
    curl --insecure --fail --silent --show-error --retry 20 --retry-all-errors --retry-delay 2 --connect-timeout 5 "$@"
  else
    curl --fail --silent --show-error --retry 20 --retry-all-errors --retry-delay 2 --connect-timeout 5 "$@"
  fi
}

curl_boundary() {
  if [ "${SMOKE_TEST_INSECURE:-}" = "1" ]; then
    curl --insecure --silent --show-error --connect-timeout 5 "$@"
  else
    curl --silent --show-error --connect-timeout 5 "$@"
  fi
}

assert_not_direct_supabase() {
  path=$1
  header_file=$tmpdir/headers-$(printf '%s' "$path" | tr '/?' '__')
  body_file=$tmpdir/body-$(printf '%s' "$path" | tr '/?' '__')
  status=$(curl_boundary --dump-header "$header_file" --output "$body_file" --write-out '%{http_code}' "$app_url$path" || printf '000')

  case "$status" in
    3* | 404 | 401 | 403) ;;
    2*) echo "Smoke boundary failed: $path returned direct-service success $status" >&2; exit 1 ;;
    *) echo "Smoke boundary failed: $path returned unexpected status $status" >&2; exit 1 ;;
  esac

  if grep -Eiq '(^server:[[:space:]]*kong|^x-kong-|^x-supabase-|^sb-|supabase)' "$header_file"; then
    echo "Smoke boundary failed: $path exposed direct Supabase/Kong headers" >&2
    exit 1
  fi
}

curl_cmd "$app_url/api/health" >/dev/null
curl_cmd "$app_url/api/ready" >/dev/null
curl_cmd "$app_url/api/bingo/state" >/dev/null
curl_cmd "$app_url/api/bingo/prizes" >/dev/null
curl_cmd "$app_url/api/bingo/screen" >/dev/null

assert_not_direct_supabase /auth/v1/health
assert_not_direct_supabase /rest/v1/
assert_not_direct_supabase /storage/v1/object/public/prize-images/nonexistent

echo "Smoke test passed for $app_url"
