#!/bin/bash

# 🚀 BINGO アプリケーション K6負荷試験
# ====================================

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 環境設定
ENVIRONMENT=${ENVIRONMENT:-"production"}
MAX_USERS=${MAX_USERS:-500}

# 引数解析
while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -u|--max-users)
      MAX_USERS="$2"
      shift 2
      ;;
    -h|--help)
      echo "使用方法: $0 [オプション] [テストタイプ]"
      echo ""
      echo "オプション:"
      echo "  -e, --environment ENV    実行環境 (local|production) [デフォルト: production]"
      echo "  -u, --max-users NUM      最大ユーザー数 [デフォルト: 500]"
      echo "  -h, --help               このヘルプを表示"
      echo ""
      echo "テストタイプ:"
      echo "  websocket                WebSocket負荷テスト"
      echo "  http                     HTTP API負荷テスト"
      echo "  optimized-http           最適化されたHTTP負荷テスト"
      echo "  optimized-websocket      最適化されたWebSocket負荷テスト"
      echo "  debug-websocket          WebSocketデバッグテスト"
      echo "  debug-local              ローカル環境デバッグテスト"
      echo "  all                      全K6負荷テスト"
      echo ""
      echo "例："
      echo "  $0 --max-users 1000 optimized-http"
      echo "  $0 -e local -u 100 websocket"
      exit 0
      ;;
    *)
      TEST_TYPE="$1"
      shift
      ;;
  esac
done

# 最大ユーザー数の検証
if ! [[ "$MAX_USERS" =~ ^[0-9]+$ ]] || [ "$MAX_USERS" -lt 1 ]; then
    echo -e "${RED}❌ エラー: 最大ユーザー数は正の整数である必要があります: $MAX_USERS${NC}"
    exit 1
fi

# 環境変数としてMAX_USERSを設定
export MAX_USERS

case $ENVIRONMENT in
  "local")
    USER_PAGE_URL="http://localhost:3000"
    API_ENDPOINT="http://localhost:8080/v1/graphql"
    WS_ENDPOINT="ws://localhost:8080/v1/graphql"
    ;;
  "production")
    USER_PAGE_URL="https://bingo.nutfes.net/"
    API_ENDPOINT="https://bingo-api.nutfes.net/v1/graphql"
    WS_ENDPOINT="wss://bingo-api.nutfes.net/v1/graphql"
    ;;
  *)
    echo -e "${RED}❌ 無効な環境: $ENVIRONMENT${NC}"
    echo "利用可能な環境: local, production"
    exit 1
    ;;
esac

# 結果保存ディレクトリの作成
mkdir -p "$RESULTS_DIR"

# ロゴとヘッダー
print_header() {
    echo -e "${CYAN}"
    echo "🚀 BINGO アプリケーション K6負荷試験"
    echo "===================================="
    echo -e "${NC}"
    echo -e "${BLUE}📂 結果保存ディレクトリ: $RESULTS_DIR${NC}"
    echo ""
}

# 環境設定確認
check_environment() {
    echo -e "${YELLOW}🔍 環境設定確認${NC}"
    echo "  対象環境:"
    echo -e "    - ユーザーページ: ${GREEN}$USER_PAGE_URL${NC}"
    echo -e "    - API エンドポイント: ${GREEN}$API_ENDPOINT${NC}"
    echo -e "    - WebSocket エンドポイント: ${GREEN}$WS_ENDPOINT${NC}"
    echo -e "    - 最大ユーザー数: ${CYAN}$MAX_USERS${NC}"
    echo ""
}

# 接続テスト
test_connectivity() {
    echo -e "${YELLOW}🔍 事前接続チェック${NC}"
    
    # ユーザーページの接続確認
    echo -n "  ユーザーページ への接続確認... "
    if curl -s --connect-timeout 10 --max-time 30 "$USER_PAGE_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo -e "${RED}エラー: ユーザーページに接続できません${NC}"
        return 1
    fi
    
    # API健全性チェック
    echo -n "  API健全性チェック への接続確認... "
    HEALTH_CHECK_QUERY='{"query": "query { __schema { types { name } } }"}'
    if curl -s --connect-timeout 10 --max-time 30 \
        -H "Content-Type: application/json" \
        -d "$HEALTH_CHECK_QUERY" \
        "$API_ENDPOINT" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo -e "${RED}エラー: APIに接続できません${NC}"
        return 1
    fi
    
    echo ""
}

# 必要なツールの確認
check_dependencies() {
    echo -e "${YELLOW}🔧 依存関係チェック${NC}"
    
    # k6の確認
    if command -v k6 >/dev/null 2>&1; then
        echo -e "  K6: ${GREEN}✅ インストール済み$(k6 version | head -1)${NC}"
    else
        echo -e "  K6: ${RED}❌ 未インストール${NC}"
        echo -e "${YELLOW}  K6をインストールしています...${NC}"
        
        # K6のインストール（Linux/macOS）
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo gpg -k
            sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
            echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
            sudo apt-get update
            sudo apt-get install k6
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew >/dev/null 2>&1; then
                brew install k6
            else
                echo -e "${RED}❌ Homebrewが必要です。https://brew.sh/ からインストールしてください${NC}"
                exit 1
            fi
        fi
    fi
    
    echo ""
}

# K6 WebSocket負荷試験
run_k6_websocket_test() {
    echo -e "${PURPLE}🌐 WebSocket専用負荷試験 (K6) を実行中...${NC}"
    
    local result_file="$RESULTS_DIR/k6_websocket_${TIMESTAMP}.json"
    
    ENVIRONMENT=$ENVIRONMENT MAX_USERS=$MAX_USERS k6 run \
        --out json="$result_file" \
        --summary-export="$RESULTS_DIR/k6_websocket_summary_${TIMESTAMP}.json" \
        "$SCRIPT_DIR/k6/websocket-load-test.js"
    
    echo -e "${GREEN}✅ WebSocket負荷試験完了${NC}"
    echo -e "📊 結果ファイル: $result_file"
    echo ""
}

# K6 HTTP API負荷試験
run_k6_http_test() {
    echo -e "${PURPLE}🌐 HTTP API負荷試験 (K6) を実行中...${NC}"
    
    local result_file="$RESULTS_DIR/k6_http_${TIMESTAMP}.json"
    
    ENVIRONMENT=$ENVIRONMENT MAX_USERS=$MAX_USERS k6 run \
        --out json="$result_file" \
        --summary-export="$RESULTS_DIR/k6_http_summary_${TIMESTAMP}.json" \
        "$SCRIPT_DIR/k6/http-api-load-test.js"
    
    echo -e "${GREEN}✅ HTTP API負荷試験完了${NC}"
    echo -e "📊 結果ファイル: $result_file"
    echo ""
}

# 最適化されたK6 HTTP負荷試験
run_optimized_k6_http_test() {
    echo -e "${PURPLE}🚀 最適化されたHTTP負荷試験 (K6) を実行中...${NC}"
    
    local result_file="$RESULTS_DIR/k6_optimized_http_${TIMESTAMP}.json"
    
    ENVIRONMENT=$ENVIRONMENT MAX_USERS=$MAX_USERS k6 run \
        --out json="$result_file" \
        --summary-export="$RESULTS_DIR/k6_optimized_http_summary_${TIMESTAMP}.json" \
        "$SCRIPT_DIR/k6/optimized-user-load-test.js"
    
    echo -e "${GREEN}✅ 最適化されたHTTP負荷試験完了${NC}"
    echo -e "📊 結果ファイル: $result_file"
    echo ""
}

# 最適化されたK6 WebSocket負荷試験
run_optimized_k6_websocket_test() {
    echo -e "${PURPLE}🌐 最適化されたWebSocket負荷試験 (K6) を実行中...${NC}"
    
    local result_file="$RESULTS_DIR/k6_optimized_websocket_${TIMESTAMP}.json"
    
    ENVIRONMENT=$ENVIRONMENT MAX_USERS=$MAX_USERS k6 run \
        --out json="$result_file" \
        --summary-export="$RESULTS_DIR/k6_optimized_websocket_summary_${TIMESTAMP}.json" \
        "$SCRIPT_DIR/k6/optimized-websocket-test.js"
    
    echo -e "${GREEN}✅ 最適化されたWebSocket負荷試験完了${NC}"
    echo -e "📊 結果ファイル: $result_file"
    echo ""
}

# デバッグ用WebSocket負荷試験
run_debug_websocket_test() {
    echo -e "${YELLOW}🐛 デバッグ用WebSocket負荷試験 (K6) を実行中...${NC}"
    
    local result_file="$RESULTS_DIR/k6_debug_websocket_${TIMESTAMP}.json"
    
    ENVIRONMENT=$ENVIRONMENT MAX_USERS=$MAX_USERS k6 run \
        --out json="$result_file" \
        --summary-export="$RESULTS_DIR/k6_debug_websocket_summary_${TIMESTAMP}.json" \
        "$SCRIPT_DIR/k6/debug-websocket-test.js"
    
    echo -e "${GREEN}✅ デバッグ用WebSocket負荷試験完了${NC}"
    echo -e "📊 結果ファイル: $result_file"
    echo ""
}

# ローカル環境デバッグ用WebSocket負荷試験
run_debug_local_websocket_test() {
    echo -e "${YELLOW}🏠 ローカル環境デバッグ用WebSocket負荷試験 (K6) を実行中...${NC}"
    
    local result_file="$RESULTS_DIR/k6_debug_local_websocket_${TIMESTAMP}.json"
    
    k6 run \
        --out json="$result_file" \
        --summary-export="$RESULTS_DIR/k6_debug_local_websocket_summary_${TIMESTAMP}.json" \
        "$SCRIPT_DIR/k6/debug-local-websocket-test.js"
    
    echo -e "${GREEN}✅ ローカル環境デバッグ用WebSocket負荷試験完了${NC}"
    echo -e "📊 結果ファイル: $result_file"
    echo ""
}

# メインメニュー
main_menu() {
    while true; do
        echo -e "${CYAN}🎯 実行するK6負荷試験を選択してください:${NC}"
        echo "  1) WebSocket負荷試験"
        echo "  2) HTTP API負荷試験"
        echo "  3) 最適化されたHTTP負荷試験"
        echo "  4) 最適化されたWebSocket負荷試験"
        echo "  5) デバッグ用WebSocket試験"
        echo "  6) ローカル環境デバッグ用WebSocket試験"
        echo "  7) 全K6負荷試験"
        echo ""
        
        read -p "選択 (1-7): " choice
        
        case $choice in
            1)
                run_k6_websocket_test
                break
                ;;
            2)
                run_k6_http_test
                break
                ;;
            3)
                run_optimized_k6_http_test
                break
                ;;
            4)
                run_optimized_k6_websocket_test
                break
                ;;
            5)
                run_debug_websocket_test
                break
                ;;
            6)
                run_debug_local_websocket_test
                break
                ;;
            7)
                echo -e "${PURPLE}🚀 全K6負荷試験を実行します...${NC}"
                run_k6_http_test
                run_k6_websocket_test
                run_optimized_k6_http_test
                run_optimized_k6_websocket_test
                break
                ;;
            *)
                echo -e "${RED}❌ 無効な選択です。1-7の範囲で選択してください。${NC}"
                echo ""
                ;;
        esac
    done
}

# メイン実行
main() {
    print_header
    check_environment
    
    if ! test_connectivity; then
        echo -e "${RED}❌ 接続テストに失敗しました。環境設定を確認してください。${NC}"
        exit 1
    fi
    
    check_dependencies
    main_menu
    
    echo -e "${GREEN}🎉 負荷試験が完了しました！${NC}"
    echo -e "${BLUE}📁 結果は $RESULTS_DIR に保存されています。${NC}"
}

# 引数による直接実行サポート
if [[ -n "$TEST_TYPE" ]]; then
    case $TEST_TYPE in
        "websocket") run_k6_websocket_test ;;
        "http") run_k6_http_test ;;
        "optimized-http") run_optimized_k6_http_test ;;
        "optimized-websocket") run_optimized_k6_websocket_test ;;
        "debug-websocket") run_debug_websocket_test ;;
        "debug-local") run_debug_local_websocket_test ;;
        "all") 
            run_k6_http_test
            run_k6_websocket_test
            run_optimized_k6_http_test
            run_optimized_k6_websocket_test
            ;;
        *) 
            echo "エラー: 無効なテストタイプ: $TEST_TYPE"
            echo "使用方法: $0 [オプション] [テストタイプ]"
            echo "詳細は --help オプションを参照してください"
            exit 1
            ;;
    esac
else
    main
fi
