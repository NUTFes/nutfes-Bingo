#!/bin/bash
# db-reset.sh - DBを完全にリセットして再初期化するスクリプト
# Usage: ./scripts/db-reset.sh [-y]  # -y で確認をスキップ

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# -y オプションで確認をスキップ
if [[ "$1" != "-y" ]]; then
    echo ""
    echo "⚠️  警告: このスクリプトはDBを完全にリセットします！"
    echo "⚠️  すべてのデータが削除されます。"
    echo ""

    read -p "続行しますか？ (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "キャンセルしました。"
        exit 0
    fi
fi

cd "$PROJECT_DIR"

echo ""
echo "🛑 Supabaseを停止中..."
docker compose down -v 2>/dev/null || true

echo ""
echo "🧹 古いボリュームをクリーンアップ中..."
docker volume prune -f > /dev/null 2>&1 || true

echo ""
echo "🗑️  データベースボリュームを削除中..."
# sudoが必要な場合とそうでない場合の両方に対応
if [ -d "volumes/db/data" ]; then
    rm -rf volumes/db/data 2>/dev/null || sudo rm -rf volumes/db/data
fi

echo ""
echo "⏳ Dockerの同期を待機中..."
sleep 2

echo ""
echo "🚀 Supabaseを起動中..."
docker compose up -d

echo ""
echo "⏳ サービスが起動するまで待機中..."
sleep 15

# ストレージセットアップを実行
"$SCRIPT_DIR/db-setup.sh"

echo ""
echo "✅ DBリセット完了！"
echo ""
echo "🌐 アクセス先:"
echo "   - Supabase Studio: http://localhost:3000"
echo "   - Kong API:        http://localhost:8000"
