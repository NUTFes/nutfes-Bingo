#!/bin/bash
# db-status.sh - 現在のDB状態を確認するスクリプト
# Usage: ./scripts/db-status.sh

echo ""
echo "📊 Supabase データベース状態"
echo "=============================="
echo ""

# コンテナ状態
echo "🐳 コンテナ状態:"
docker ps --filter "name=supabase" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -15
echo ""

# テーブル一覧
echo "📋 public スキーマのテーブル一覧:"
docker exec supabase-db psql -U postgres -d postgres -c "
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
" 2>/dev/null || echo "❌ DBに接続できません"
echo ""

# 各テーブルのレコード数
echo "📈 各テーブルのレコード数:"
docker exec supabase-db psql -U postgres -d postgres -c "
SELECT 'numbers' as table_name, COUNT(*) as count FROM public.numbers
UNION ALL SELECT 'images', COUNT(*) FROM public.images
UNION ALL SELECT 'prizes', COUNT(*) FROM public.prizes
UNION ALL SELECT 'events', COUNT(*) FROM public.events
UNION ALL SELECT 'reach_logs', COUNT(*) FROM public.reach_logs
UNION ALL SELECT 'stamp_triggers', COUNT(*) FROM public.stamp_triggers
ORDER BY table_name;
" 2>/dev/null || echo "❌ DBに接続できません"
echo ""

# ストレージバケット
echo "📦 ストレージバケット:"
docker exec supabase-db psql -U postgres -d postgres -c "
SELECT id, name, public FROM storage.buckets;
" 2>/dev/null || echo "❌ DBに接続できません"
