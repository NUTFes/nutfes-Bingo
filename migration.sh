#!/bin/bash

# データベース名
DB_NAME="default"

# マイグレーションディレクトリ
MIGRATIONS_DIR="migrations/default"

# ディレクトリが存在するか確認
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Error: '$MIGRATIONS_DIR' directory does not exist. Please check your migrations directory."
  exit 1
fi

# 古いマイグレーションを取得
OLD_MIGRATIONS=$(find "$MIGRATIONS_DIR" -maxdepth 1 -type d -name '*_auto' | sort | head -n -1)

# 最初のマイグレーションを取得
FROM_VERSION=$(find "$MIGRATIONS_DIR" -maxdepth 1 -type d -name '*_auto' | sort | head -n 1 | xargs basename | cut -d'_' -f1)

# FROM_VERSION が空の場合はエラー
if [ -z "$FROM_VERSION" ]; then
  echo "Error: No migrations found in '$MIGRATIONS_DIR'. Please ensure you have migrations available."
  exit 1
fi

# 引数の確認
if [ "$1" == "squash" ]; then
  echo "Squashing migrations from version $FROM_VERSION"
  docker compose exec api hasura migrate squash --from "$FROM_VERSION" --database-name "$DB_NAME"
elif [ "$1" == "clean" ]; then
  echo "Removing old migrations..."
  for dir in $OLD_MIGRATIONS; do
    echo "Removing $dir"
    rm -rf "$dir"
  done
elif [ "$1" == "apply" ]; then
  echo "Applying migrations..."
  docker compose exec api hasura migrate apply --database-name "$DB_NAME"
elif [ "$1" == "reload" ]; then
  echo "Reloading metadata..."
  docker compose exec api hasura metadata reload
else
  echo "Usage: $0 {squash|clean|apply|reload}"
  exit 1
fi
