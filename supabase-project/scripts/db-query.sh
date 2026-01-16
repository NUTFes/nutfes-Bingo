#!/bin/bash
# db-query.sh - SQLクエリを簡単に実行するためのヘルパースクリプト
# Usage: 
#   ./scripts/db-query.sh "SELECT * FROM public.numbers LIMIT 5;"
#   ./scripts/db-query.sh -f path/to/file.sql

set -e

if [ "$1" = "-f" ]; then
    # ファイルからSQLを実行
    if [ -z "$2" ]; then
        echo "Usage: $0 -f <sql_file>"
        exit 1
    fi
    docker exec -i supabase-db psql -U postgres -d postgres < "$2"
elif [ -n "$1" ]; then
    # 引数のSQLを実行
    docker exec supabase-db psql -U postgres -d postgres -c "$1"
else
    # インタラクティブモード
    echo "📝 PostgreSQL インタラクティブモードを開始します"
    echo "   終了するには \\q を入力してください"
    echo ""
    docker exec -it supabase-db psql -U postgres -d postgres
fi
