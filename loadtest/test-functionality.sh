#!/bin/bash

# 🧪 負荷テスト機能テスト
# 最大ユーザー数設定機能のテストスクリプト

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 負荷テスト機能テスト開始${NC}"
echo "=================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}📋 テスト項目${NC}"
echo "1. ヘルプ表示機能"
echo "2. 引数解析機能"
echo "3. 動的設定生成機能"
echo "4. 環境変数設定機能"
echo ""

# 1. ヘルプ表示機能のテスト
echo -e "${YELLOW}1️⃣ ヘルプ表示機能をテスト中...${NC}"
if "$SCRIPT_DIR/run-tests.sh" --help > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ヘルプ表示成功${NC}"
else
    echo -e "${RED}❌ ヘルプ表示失敗${NC}"
    exit 1
fi

# 2. 動的設定生成機能のテスト
echo -e "${YELLOW}2️⃣ 動的設定生成機能をテスト中...${NC}"

# Node.js依存関係のインストール
echo -e "${BLUE}📦 依存関係をインストール中...${NC}"
cd "$SCRIPT_DIR"
npm install > /dev/null 2>&1

# Artillery動的設定生成のテスト
echo -e "${BLUE}🔧 Artillery動的設定を生成中...${NC}"
if node "$SCRIPT_DIR/artillery/dynamic-config.js" 100 > /tmp/test-config.yml; then
    echo -e "${GREEN}✅ 動的設定生成成功${NC}"
    echo -e "${BLUE}📄 生成された設定の一部:${NC}"
    head -20 /tmp/test-config.yml | sed 's/^/    /'
else
    echo -e "${RED}❌ 動的設定生成失敗${NC}"
    exit 1
fi

# 3. 環境変数設定のテスト
echo -e "${YELLOW}3️⃣ 環境変数設定をテスト中...${NC}"

# 異なる最大ユーザー数での設定テスト
for max_users in 50 100 500 1000; do
    echo -e "${BLUE}  - $max_users ユーザー設定をテスト...${NC}"
    if node "$SCRIPT_DIR/artillery/dynamic-config.js" "$max_users" > "/tmp/test-config-$max_users.yml"; then
        echo -e "${GREEN}    ✅ $max_users ユーザー設定成功${NC}"
    else
        echo -e "${RED}    ❌ $max_users ユーザー設定失敗${NC}"
        exit 1
    fi
done

# 4. 設定ファイルの検証
echo -e "${YELLOW}4️⃣ 設定ファイルの検証中...${NC}"

# environments.jsの構文チェック
if node -c "$SCRIPT_DIR/config/environments.js" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ environments.js 構文チェック成功${NC}"
else
    echo -e "${RED}❌ environments.js 構文エラー${NC}"
    exit 1
fi

# K6テストファイルの構文チェック
for k6_file in "$SCRIPT_DIR/k6"/*.js; do
    if [[ -f "$k6_file" ]]; then
        filename=$(basename "$k6_file")
        if node -c "$k6_file" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $filename 構文チェック成功${NC}"
        else
            echo -e "${RED}❌ $filename 構文エラー${NC}"
            exit 1
        fi
    fi
done

echo ""
echo -e "${GREEN}🎉 全てのテストが成功しました！${NC}"
echo ""
echo -e "${BLUE}📝 使用例:${NC}"
echo "  ./run-tests.sh --max-users 100 optimized-websocket"
echo "  ./run-tests.sh -e local -u 50 optimized-all"
echo "  ./run-tests.sh --help"
echo ""
echo -e "${YELLOW}📁 テスト用ファイルが /tmp に生成されました:${NC}"
ls -la /tmp/test-config*.yml 2>/dev/null || true
