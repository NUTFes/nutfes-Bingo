#!/bin/bash
# db-setup.sh - Supabase起動後にストレージバケットとポリシーを設定するスクリプト
# Usage: ./scripts/db-setup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔧 Supabase ストレージバケットをセットアップ中..."

# DBコンテナが起動するまで待機
max_attempts=30
attempt=0
until docker exec supabase-db pg_isready -U postgres > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ DBコンテナの起動がタイムアウトしました"
        exit 1
    fi
    echo "⏳ DBの起動を待機中... ($attempt/$max_attempts)"
    sleep 2
done

echo "✅ DBが起動しました"

# bingoバケットを作成
echo "📦 bingoストレージバケットを作成中..."
docker exec supabase-db psql -U postgres -d postgres -c "
INSERT INTO storage.buckets (id, name, public)
VALUES ('bingo', 'bingo', true)
ON CONFLICT (id) DO UPDATE SET public = true;
" > /dev/null

# ストレージポリシーを設定
echo "🔐 ストレージのRLSポリシーを設定中..."
docker exec supabase-db psql -U supabase_admin -d postgres -c "
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read access for bingo bucket objects
DROP POLICY IF EXISTS \"public_read_bingo\" ON storage.objects;
CREATE POLICY \"public_read_bingo\" ON storage.objects FOR SELECT USING (bucket_id = 'bingo');

-- Allow uploads to bingo bucket
DROP POLICY IF EXISTS \"allow_upload_bingo\" ON storage.objects;
CREATE POLICY \"allow_upload_bingo\" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'bingo');

-- Allow updates in bingo bucket
DROP POLICY IF EXISTS \"allow_update_bingo\" ON storage.objects;
CREATE POLICY \"allow_update_bingo\" ON storage.objects FOR UPDATE USING (bucket_id = 'bingo');

-- Allow deletes in bingo bucket
DROP POLICY IF EXISTS \"allow_delete_bingo\" ON storage.objects;
CREATE POLICY \"allow_delete_bingo\" ON storage.objects FOR DELETE USING (bucket_id = 'bingo');
" > /dev/null 2>&1

echo "✅ ストレージセットアップ完了！"
echo ""
echo "📊 セットアップ結果:"
docker exec supabase-db psql -U postgres -d postgres -c "
SELECT 'numbers' as table_name, COUNT(*) as count FROM public.numbers
UNION ALL
SELECT 'events', COUNT(*) FROM public.events
UNION ALL
SELECT 'storage.buckets', COUNT(*) FROM storage.buckets WHERE id = 'bingo';
"
