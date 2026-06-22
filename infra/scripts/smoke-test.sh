#!/bin/sh

set -eu

app_url=${1:?Usage: smoke-test.sh https://app.example.com}
app_url=${app_url%/}

curl_cmd() {
  if [ "${SMOKE_TEST_INSECURE:-}" = "1" ]; then
    curl --insecure "$@"
  else
    curl "$@"
  fi
}

curl_cmd --fail --silent --show-error "$app_url/api/health" >/dev/null
curl_cmd --fail --silent --show-error "$app_url/api/ready" >/dev/null
curl_cmd --fail --silent --show-error "$app_url/api/bingo/state" >/dev/null
curl_cmd --fail --silent --show-error "$app_url/api/bingo/prizes" >/dev/null
curl_cmd --fail --silent --show-error "$app_url/api/bingo/screen" >/dev/null

echo "Smoke test passed for $app_url"
