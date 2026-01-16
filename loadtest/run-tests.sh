#!/bin/bash
# Supabase Load Test Runner
# Usage: ./run-tests.sh [test-type] [--quick|--full]
#
# test-type: rest | realtime | combined | all (default: all)
# --quick: 短時間テスト（5分程度、最大300 VUs）
# --full: フルテスト（15分程度、最大1000 VUs）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Parse arguments
TEST_TYPE="${1:-all}"
TEST_MODE="${2:---quick}"

# Export environment variables
export SUPABASE_URL="${SUPABASE_URL:-http://localhost:8000}"
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY4NDQ2MjcwLCJleHAiOjE5MjYxMjYyNzB9.F1-eKyrx5hWJYUlXzO17K0PCAGILQwmOTCyCiyzjiws}"

echo "=================================================="
echo "Supabase Load Test"
echo "=================================================="
echo "Target URL: $SUPABASE_URL"
echo "Test Type: $TEST_TYPE"
echo "Test Mode: $TEST_MODE"
echo "Results Dir: $RESULTS_DIR"
echo "=================================================="
echo ""

# Quick test parameters (shorter duration, fewer VUs)
QUICK_REST_PARAMS="--vus 50 --duration 2m"
QUICK_REALTIME_PARAMS="--vus 50 --duration 2m"
QUICK_COMBINED_PARAMS="--vus 50 --duration 3m"

run_rest_test() {
    echo "🚀 Running REST API Load Test..."
    if [ "$TEST_MODE" == "--quick" ]; then
        k6 run $QUICK_REST_PARAMS "$SCRIPT_DIR/rest-api-test.js" 2>&1 | tee "$RESULTS_DIR/rest-api-$(date +%Y%m%d_%H%M%S).log"
    else
        k6 run "$SCRIPT_DIR/rest-api-test.js" 2>&1 | tee "$RESULTS_DIR/rest-api-$(date +%Y%m%d_%H%M%S).log"
    fi
    echo ""
}

run_realtime_test() {
    echo "🔌 Running WebSocket Realtime Load Test..."
    if [ "$TEST_MODE" == "--quick" ]; then
        k6 run $QUICK_REALTIME_PARAMS "$SCRIPT_DIR/realtime-test.js" 2>&1 | tee "$RESULTS_DIR/realtime-$(date +%Y%m%d_%H%M%S).log"
    else
        k6 run "$SCRIPT_DIR/realtime-test.js" 2>&1 | tee "$RESULTS_DIR/realtime-$(date +%Y%m%d_%H%M%S).log"
    fi
    echo ""
}

run_combined_test() {
    echo "🔄 Running Combined Load Test (REST + WebSocket)..."
    if [ "$TEST_MODE" == "--quick" ]; then
        k6 run $QUICK_COMBINED_PARAMS "$SCRIPT_DIR/combined-test.js" 2>&1 | tee "$RESULTS_DIR/combined-$(date +%Y%m%d_%H%M%S).log"
    else
        k6 run "$SCRIPT_DIR/combined-test.js" 2>&1 | tee "$RESULTS_DIR/combined-$(date +%Y%m%d_%H%M%S).log"
    fi
    echo ""
}

case "$TEST_TYPE" in
    rest)
        run_rest_test
        ;;
    realtime)
        run_realtime_test
        ;;
    combined)
        run_combined_test
        ;;
    all)
        echo "Running all tests sequentially..."
        echo ""
        run_rest_test
        echo "Waiting 10 seconds before next test..."
        sleep 10
        run_realtime_test
        echo "Waiting 10 seconds before next test..."
        sleep 10
        run_combined_test
        ;;
    *)
        echo "Unknown test type: $TEST_TYPE"
        echo "Usage: ./run-tests.sh [rest|realtime|combined|all] [--quick|--full]"
        exit 1
        ;;
esac

echo "=================================================="
echo "✅ Load Test Complete!"
echo "Results saved to: $RESULTS_DIR"
echo "=================================================="
