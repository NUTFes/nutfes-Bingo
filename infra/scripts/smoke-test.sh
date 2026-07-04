#!/bin/sh

set -eu

app_url=${1:?Usage: smoke-test.sh https://app.example.com}
app_url=${app_url%/}

curl_cmd() {
  if [ "${SMOKE_TEST_INSECURE:-}" = "1" ]; then
    curl --insecure --fail --silent --show-error --retry 20 --retry-all-errors --retry-delay 2 --connect-timeout 5 "$@"
  else
    curl --fail --silent --show-error --retry 20 --retry-all-errors --retry-delay 2 --connect-timeout 5 "$@"
  fi
}

curl_cmd "$app_url/api/health" >/dev/null
curl_cmd "$app_url/api/ready" >/dev/null
curl_cmd "$app_url/api/bingo/state" >/dev/null
curl_cmd "$app_url/api/bingo/prizes" >/dev/null
curl_cmd "$app_url/api/bingo/screen" >/dev/null

echo "Smoke test passed for $app_url"
