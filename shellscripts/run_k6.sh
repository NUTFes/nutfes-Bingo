#!/bin/bash
set -euo pipefail

K6_IMAGE="loadimpact/k6"
TEST_SCRIPT="${1:-websocket_test.js}"

# このスクリプト自身があるディレクトリをマウントする
HOST_SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER_SCRIPTS_DIR="/scripts"

echo "==> Pulling ${K6_IMAGE}..."
docker pull "${K6_IMAGE}"

echo "==> Running k6 test script: ${TEST_SCRIPT}"
docker run --rm -i \
  --network nutfes-bingo_default \  # ← bingo_api が存在するネットワーク名にする
  -v "${HOST_SCRIPTS_DIR}:${CONTAINER_SCRIPTS_DIR}" \
  -w "${CONTAINER_SCRIPTS_DIR}" \
  "${K6_IMAGE}" run "${TEST_SCRIPT}"

echo "==> Finished."
