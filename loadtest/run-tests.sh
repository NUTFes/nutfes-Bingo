#!/bin/bash

# 🚀 BINGO アプリケーション 統合負荷試験
# ==========================================

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
      echo "  artillery                Artillery負荷テスト"
      echo "  optimized-http           最適化されたHTTP負荷テスト"
      echo "  optimized-websocket      最適化されたWebSocket負荷テスト"
      echo "  optimized-artillery      最適化されたArtillery負荷テスト"
      echo "  optimized-all            最適化された全テスト"
      echo "  debug-websocket          WebSocketデバッグテスト"
      echo "  all                      全負荷テスト"
      echo ""
      echo "例："
      echo "  $0 --max-users 1000 optimized-all"
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
    echo "🚀 BINGO アプリケーション 統合負荷試験"
    echo "==========================================="
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
    
    # Artilleryの確認
    if command -v artillery >/dev/null 2>&1; then
        echo -e "  Artillery: ${GREEN}✅ インストール済み$(artillery version)${NC}"
    else
        echo -e "  Artillery: ${RED}❌ 未インストール${NC}"
        echo -e "${YELLOW}  Artilleryをインストールしています...${NC}"
        npm install -g artillery
    fi
    
    echo ""
}

# K6 WebSocket負荷試験
run_k6_websocket_test() {
    echo -e "${PURPLE}🌐 WebSocket専用負荷試験 (K6) を実行中...${NC}"
    
    local result_file="$RESULTS_DIR/k6_websocket_${TIMESTAMP}.json"
    local html_report="$RESULTS_DIR/k6_websocket_${TIMESTAMP}.html"
    
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
    local html_report="$RESULTS_DIR/k6_http_${TIMESTAMP}.html"
    
    ENVIRONMENT=$ENVIRONMENT MAX_USERS=$MAX_USERS k6 run \
        --out json="$result_file" \
        --summary-export="$RESULTS_DIR/k6_http_summary_${TIMESTAMP}.json" \
        "$SCRIPT_DIR/k6/http-api-load-test.js"
    
    echo -e "${GREEN}✅ HTTP API負荷試験完了${NC}"
    echo -e "📊 結果ファイル: $result_file"
    echo ""
}

# Artillery統合負荷試験
run_artillery_test() {
    echo -e "${PURPLE}🎯 統合負荷試験 (Artillery) を実行中...${NC}"
    
    local result_file="$RESULTS_DIR/artillery_${TIMESTAMP}.json"
    local html_report="$RESULTS_DIR/artillery_report_${TIMESTAMP}.html"
    
    # 環境変数の設定
    export API_ENDPOINT="$API_ENDPOINT"
    export WS_TARGET="$WS_ENDPOINT"
    export USER_PAGE_URL="$USER_PAGE_URL"
    
    artillery run \
        --output "$result_file" \
        "$SCRIPT_DIR/artillery/integrated-load-test.yml"
    
    # HTMLレポートの生成
    artillery report --output "$html_report" "$result_file"
    
    echo -e "${GREEN}✅ 統合負荷試験完了${NC}"
    echo -e "📊 結果ファイル: $result_file"
    echo -e "📈 HTMLレポート: $html_report"
    echo ""
}

# 最適化されたK6 HTTP負荷試験
run_optimized_k6_http_test() {
    echo -e "${PURPLE}🚀 最適化されたHTTP負荷試験 (K6) を実行中...${NC}"
    
    local result_file="$RESULTS_DIR/k6_optimized_http_${TIMESTAMP}.json"
    local html_report="$RESULTS_DIR/k6_optimized_http_${TIMESTAMP}.html"
    
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

# 最適化されたArtillery統合試験
run_optimized_artillery_test() {
    echo -e "${PURPLE}🎯 最適化されたArtillery統合試験を実行中...${NC}"
    
    local result_file="$RESULTS_DIR/artillery_optimized_${TIMESTAMP}.json"
    local dynamic_config="$RESULTS_DIR/artillery_dynamic_config_${TIMESTAMP}.yml"
    
    # 動的設定の生成
    echo -e "${BLUE}🔧 最大ユーザー数 $MAX_USERS に基づく動的設定を生成中...${NC}"
    node "$SCRIPT_DIR/artillery/dynamic-config.js" "$MAX_USERS" > "$dynamic_config"
    
    # 環境変数の設定
    export API_ENDPOINT="$API_ENDPOINT"
    export USER_PAGE_URL="$USER_PAGE_URL"
    export WS_TARGET="$WS_ENDPOINT"
    export ADMIN_SECRET="/4XQdRUHXGtW"
    
    artillery run \
        --output "$result_file" \
        --environment "$ENVIRONMENT" \
        "$dynamic_config"
    
    # HTMLレポート生成
    artillery report "$result_file" --output "$RESULTS_DIR/artillery_optimized_report_${TIMESTAMP}.html"
    
    echo -e "${GREEN}✅ 最適化されたArtillery統合試験完了${NC}"
    echo -e "📊 結果ファイル: $result_file"
    echo -e "📄 HTMLレポート: $RESULTS_DIR/artillery_optimized_report_${TIMESTAMP}.html"
    echo -e "⚙️  動的設定: $dynamic_config"
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

# カスタム負荷試験設定
run_custom_test() {
    echo -e "${YELLOW}⚙️ カスタム負荷試験設定${NC}"
    echo ""
    
    echo "負荷パターンを選択してください:"
    echo "  1) 軽負荷 (10ユーザー、2分間)"
    echo "  2) 中負荷 (50ユーザー、5分間)"  
    echo "  3) 重負荷 (200ユーザー、10分間)"
    echo "  4) ストレステスト (500ユーザー、15分間)"
    echo ""
    
    read -p "選択 (1-4): " load_pattern
    
    case $load_pattern in
        1)
            export K6_VUS=10
            export K6_DURATION="2m"
            echo -e "${BLUE}軽負荷設定で実行します${NC}"
            ;;
        2)
            export K6_VUS=50
            export K6_DURATION="5m"
            echo -e "${BLUE}中負荷設定で実行します${NC}"
            ;;
        3)
            export K6_VUS=200
            export K6_DURATION="10m"
            echo -e "${BLUE}重負荷設定で実行します${NC}"
            ;;
        4)
            export K6_VUS=500
            export K6_DURATION="15m"
            echo -e "${BLUE}ストレステスト設定で実行します${NC}"
            ;;
        *)
            echo -e "${RED}無効な選択です${NC}"
            return 1
            ;;
    esac
    
    echo ""
    echo "実行する試験を選択してください:"
    echo "  1) K6 WebSocket試験"
    echo "  2) K6 HTTP API試験"
    echo "  3) Artillery統合試験"
    echo ""
    
    read -p "選択 (1-3): " test_type
    
    case $test_type in
        1) run_k6_websocket_test ;;
        2) run_k6_http_test ;;
        3) run_artillery_test ;;
        *) echo -e "${RED}無効な選択です${NC}" ;;
    esac
}

# レポート生成
generate_report() {
    echo -e "${CYAN}📈 総合レポート生成中...${NC}"
    
    local report_file="$RESULTS_DIR/comprehensive_report_${TIMESTAMP}.md"
    
    cat > "$report_file" << EOF
# BINGO アプリケーション 負荷試験レポート

**実行日時**: $(date)
**対象環境**: $ENVIRONMENT
**テスト実行者**: $(whoami)

## 環境設定

- **ユーザーページ**: $USER_PAGE_URL
- **API エンドポイント**: $API_ENDPOINT
- **WebSocket エンドポイント**: $WS_ENDPOINT

## 試験結果サマリー

### パフォーマンス指標

| 指標 | 目標値 | 実測値 | 判定 |
|------|--------|--------|------|
| HTTP平均レスポンス時間 | < 500ms | - | - |
| HTTP 95%ile レスポンス時間 | < 1000ms | - | - |
| HTTP 99%ile レスポンス時間 | < 2000ms | - | - |
| WebSocket接続時間 | < 1000ms | - | - |
| WebSocketメッセージ遅延 | < 100ms | - | - |
| エラー率 | < 1% | - | - |

### 負荷パターン

1. **ウォームアップ**: 10ユーザー、30秒
2. **通常負荷**: 50ユーザー、2分
3. **ピーク負荷**: 200ユーザー、5分
4. **ストレス負荷**: 500ユーザー、3分

## 詳細結果

結果ファイルの場所:
- K6 WebSocket試験: $RESULTS_DIR/k6_websocket_${TIMESTAMP}.json
- K6 HTTP API試験: $RESULTS_DIR/k6_http_${TIMESTAMP}.json
- Artillery統合試験: $RESULTS_DIR/artillery_${TIMESTAMP}.json

## 推奨改善事項

1. **パフォーマンス最適化**
   - データベースクエリの最適化
   - キャッシュ戦略の見直し
   - CDN活用の検討

2. **スケーラビリティ**
   - 水平スケーリングの準備
   - ロードバランサーの設定
   - WebSocket接続プールの最適化

3. **監視・運用**
   - APMツールの導入
   - アラート設定の強化
   - 継続的な性能監視

EOF

    echo -e "${GREEN}✅ 総合レポート生成完了${NC}"
    echo -e "📋 レポートファイル: $report_file"
    echo ""
}

# 最適化された全テストの実行
run_optimized_all_tests() {
    echo -e "${CYAN}🚀 最適化された全負荷試験を実行中...${NC}"
    echo ""
    
    run_optimized_k6_http_test
    sleep 10
    
    run_optimized_k6_websocket_test
    sleep 10
    
    run_optimized_artillery_test
    
    echo -e "${GREEN}🎉 全ての最適化されたテストが完了しました！${NC}"
    echo ""
}

# メインメニュー
main_menu() {
    while true; do
        echo -e "${CYAN}🎯 実行する負荷試験を選択してください:${NC}"
        echo "  1) WebSocket専用負荷試験 (K6)"
        echo "  2) HTTP API負荷試験 (K6)"
        echo "  3) 統合負荷試験 (Artillery)"
        echo "  4) 全て実行"
        echo "  5) カスタム実行"
        echo "  6) 最適化されたHTTP負荷試験 (K6)"
        echo "  7) 最適化されたWebSocket負荷試験 (K6)"
        echo "  8) 最適化された統合試験 (Artillery)"
        echo "  9) 最適化された全テスト実行"
        echo "  10) デバッグ用WebSocket試験 (軽負荷)"
        echo "  11) ローカル環境デバッグ用WebSocket試験"
        echo ""
        
        read -p "選択 (1-11): " choice
        
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
                run_artillery_test
                break
                ;;
            4)
                echo -e "${PURPLE}🚀 全ての負荷試験を実行します...${NC}"
                run_k6_websocket_test
                run_k6_http_test
                run_artillery_test
                generate_report
                break
                ;;
            5)
                run_custom_test
                break
                ;;
            6)
                run_optimized_k6_http_test
                break
                ;;
            7)
                run_optimized_k6_websocket_test
                break
                ;;
            8)
                run_optimized_artillery_test
                break
                ;;
            9)
                run_optimized_all_tests
                break
                ;;
            10)
                run_debug_websocket_test
                break
                ;;
            11)
                run_debug_local_websocket_test
                break
                ;;
            *)
                echo -e "${RED}❌ 無効な選択です。1-11の範囲で選択してください。${NC}"
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
        "artillery") run_artillery_test ;;
        "optimized-http") run_optimized_k6_http_test ;;
        "optimized-websocket") run_optimized_k6_websocket_test ;;
        "optimized-artillery") run_optimized_artillery_test ;;
        "optimized-all") run_optimized_all_tests ;;
        "debug-websocket") run_debug_websocket_test ;;
        "all") 
            run_k6_websocket_test
            run_k6_http_test  
            run_artillery_test
            generate_report
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
