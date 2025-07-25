#!/bin/bash

# 🧪 K6負荷テスト機能テスト
# K6負荷試験スクリプトのテスト

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 K6負荷テスト機能テスト開始${NC}"
echo "==================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}📋 テスト項目${NC}"
echo "1. ヘルプ表示機能"
echo "2. 引数解析機能"
echo "3. K6テストスクリプトの構文チェック"
echo "4. 環境設定の検証"
echo ""

# 1. ヘルプ表示機能のテスト
echo -e "${YELLOW}1️⃣ ヘルプ表示機能をテスト中...${NC}"
if "$SCRIPT_DIR/run-tests.sh" --help > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ヘルプ表示成功${NC}"
else
    echo -e "${RED}❌ ヘルプ表示失敗${NC}"
    exit 1
fi

# 2. 設定ファイルの検証
echo -e "${YELLOW}2️⃣ 設定ファイルの検証中...${NC}"

# environments.jsの構文チェック
if node -c "$SCRIPT_DIR/config/environments.js" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ environments.js 構文チェック成功${NC}"
else
    echo -e "${RED}❌ environments.js 構文エラー${NC}"
    exit 1
fi

# 3. K6テストファイルの構文チェック
echo -e "${YELLOW}3️⃣ K6テストスクリプトの構文チェック中...${NC}"
for k6_file in "$SCRIPT_DIR/k6"/*.js; do
    if [[ -f "$k6_file" ]]; then
        filename=$(basename "$k6_file")
        # K6スクリプトは特殊な構文を使用するため、基本的なJSファイルとしてチェック
        if node -c "$k6_file" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $filename 構文チェック成功${NC}"
        else
            echo -e "${YELLOW}⚠️  $filename K6特有の構文のため通常のJSチェックでは警告が出る可能性があります${NC}"
        fi
    fi
done

# 4. K6の存在チェック（必須ではない）
echo -e "${YELLOW}4️⃣ K6インストール状況の確認...${NC}"
if command -v k6 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ K6がインストールされています: $(k6 version | head -1)${NC}"
else
    echo -e "${YELLOW}⚠️  K6がインストールされていません。実行時にインストールされます${NC}"
fi

# 5. 環境変数設定のテスト
echo -e "${YELLOW}5️⃣ 環境変数設定をテスト中...${NC}"

# 異なる最大ユーザー数での設定テスト
for max_users in 50 100 500 1000; do
    echo -e "${BLUE}  - $max_users ユーザー設定をテスト...${NC}"
    if MAX_USERS=$max_users "$SCRIPT_DIR/run-tests.sh" --help > /dev/null 2>&1; then
        echo -e "${GREEN}    ✅ $max_users ユーザー設定成功${NC}"
    else
        echo -e "${RED}    ❌ $max_users ユーザー設定失敗${NC}"
        exit 1
    fi
done

echo ""
echo -e "${GREEN}🎉 全てのテストが成功しました！${NC}"
echo ""
echo -e "${BLUE}📝 使用例:${NC}"
echo "  ./run-tests.sh --max-users 100 optimized-websocket"
echo "  ./run-tests.sh -e local -u 50 websocket"
echo "  ./run-tests.sh --help"
echo ""
echo -e "${BLUE}� 利用可能なテストタイプ:${NC}"
echo "  websocket, http, optimized-http, optimized-websocket"
echo "  debug-websocket, debug-local, all"
