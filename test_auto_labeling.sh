#!/bin/bash

# ブランチを作成
git checkout -b test-auto-labeling

# テスト用のファイルを作成・変更

# フロントエンドのテスト
mkdir -p view-user
echo "test" > view-user/test.txt

mkdir -p view-admin
echo "test" > view-admin/test.txt

# バックエンドのテスト
mkdir -p api
echo "test" > api/test.txt

mkdir -p hasura
echo "test" > hasura/test.txt

# インフラのテスト
echo "test" > docker-compose.yml
echo "test" > Dockerfile

# srcディレクトリのテスト
mkdir -p src/components/common
echo "test" > src/components/common/test.txt

mkdir -p src/gql
echo "test" > src/gql/test.txt

mkdir -p src/pages
echo "test" > src/pages/test.txt

mkdir -p src/styles
echo "test" > src/styles/test.txt

mkdir -p src/type
echo "test" > src/type/test.txt

# 変更をコミットしてプッシュ
git add .
git commit -m "Add test files for auto-labeling"
git push origin test-auto-labeling

# GitHub CLIを使用してプルリクエストを作成
gh pr create --title "Test auto-labeling" --body "This is a test PR to verify auto-labeling workflow." --base main --head test-auto-labeling
