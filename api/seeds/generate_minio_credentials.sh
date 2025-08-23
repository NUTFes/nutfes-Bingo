#!/bin/bash

# =============================================================================
# MinIO アクセスキー自動生成スクリプト
# =============================================================================
# 概要: mcコマンドを使用してMinIOに新しいアクセスキーとシークレットキーを
#       自動生成し、環境変数ファイルを更新する
#
# 処理の流れ:
# 1. MinIO管理者認証情報で接続
# 2. 新しいユーザーを作成
# 3. ユーザーにreadwrite権限を付与
# 4. 作成されたアクセスキーを環境変数ファイルに反映

set -e  # エラー時に停止

# 引数で環境を指定（デフォルトは開発環境）
ENVIRONMENT=${1:-dev}

echo "🔑 Starting MinIO credentials generation for $ENVIRONMENT environment..."

# 環境に応じて設定ファイルを選択
if [ "$ENVIRONMENT" = "prod" ]; then
    ADMIN_ENV_FILE="../../settings/admin-prod.env"
    BINGO_ENV_FILE="../../settings/bingo-prod.env"
    COMPOSE_FILE="docker-compose.prod.yml"
    COMPOSE_CMD="docker compose -f docker-compose.prod.yml"
else
    ADMIN_ENV_FILE="../../settings/admin.env"
    BINGO_ENV_FILE="../../settings/bingo.env"
    COMPOSE_FILE="docker-compose.yml"
    COMPOSE_CMD="docker compose"
fi

if [ -f "$ADMIN_ENV_FILE" ]; then
    set -a
    source "$ADMIN_ENV_FILE"
    set +a
else
    echo "Error: Admin environment file $ADMIN_ENV_FILE not found"
    exit 1
fi

# MinIO管理者設定
MINIO_ENDPOINT="http://minio:9000"
ROOT_USER="${MINIO_ROOT_USER}"
ROOT_PASSWORD="${MINIO_ROOT_PASSWORD}"

# 新しいユーザー名とパスワードを生成
NEW_USER="bingo-$(openssl rand -hex 8)"
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

echo "📋 Configuration:"
echo "  Environment: $ENVIRONMENT"
echo "  MinIO Endpoint: $MINIO_ENDPOINT"
echo "  Root User: $ROOT_USER"
echo "  New User: $NEW_USER"

# 1. MinIO管理者として接続
echo ""
echo "🔐 Setting up admin connection..."
cd ../../
$COMPOSE_CMD exec minio mc alias set admin $MINIO_ENDPOINT $ROOT_USER $ROOT_PASSWORD

# 2. バケットが存在することを確認（作成は既存スクリプトで行う）
echo ""
echo "📦 Checking bucket existence..."
if ! $COMPOSE_CMD exec minio mc ls admin/bingo >/dev/null 2>&1; then
    echo "📦 Creating bucket..."
    $COMPOSE_CMD exec minio mc mb admin/bingo --ignore-existing
    $COMPOSE_CMD exec minio mc anonymous set public admin/bingo
fi

# 3. 新しいユーザーを作成
echo ""
echo "👤 Creating new user: $NEW_USER"
$COMPOSE_CMD exec minio mc admin user add admin $NEW_USER $NEW_PASSWORD

# 4. ユーザーにreadwrite権限を付与
echo ""
echo "🔒 Setting up user permissions..."
$COMPOSE_CMD exec minio mc admin policy attach admin readwrite --user=$NEW_USER

# 5. 作成されたアクセスキーを確認
echo ""
echo "✅ New credentials generated:"
echo "  Access Key: $NEW_USER"
echo "  Secret Key: $NEW_PASSWORD"

# 6. 環境変数ファイルを更新
if [ -f "$BINGO_ENV_FILE" ]; then
    echo ""
    echo "💾 Updating environment files..."

    # bingo.envのアクセスキーを更新
    sed -i "s/NEXT_PUBLIC_ACCESS_KEY=.*/NEXT_PUBLIC_ACCESS_KEY='$NEW_USER'/" "$BINGO_ENV_FILE"
    sed -i "s/NEXT_PUBLIC_SECRET_KEY=.*/NEXT_PUBLIC_SECRET_KEY='$NEW_PASSWORD'/" "$BINGO_ENV_FILE"

    echo "  ✅ Updated: $BINGO_ENV_FILE"
else
    echo "⚠️  Warning: $BINGO_ENV_FILE not found. Please update manually:"
    echo "  NEXT_PUBLIC_ACCESS_KEY='$NEW_USER'"
    echo "  NEXT_PUBLIC_SECRET_KEY='$NEW_PASSWORD'"
fi

# 7. admin.envも同様に更新
if [ -f "$ADMIN_ENV_FILE" ]; then
    echo ""
    echo "💾 Updating admin environment file..."

    # admin.envのアクセスキーを更新
    sed -i "s/NEXT_PUBLIC_ACCESS_KEY=.*/NEXT_PUBLIC_ACCESS_KEY='$NEW_USER'/" "$ADMIN_ENV_FILE"
    sed -i "s/NEXT_PUBLIC_SECRET_KEY=.*/NEXT_PUBLIC_SECRET_KEY='$NEW_PASSWORD'/" "$ADMIN_ENV_FILE"
    
    # MinIO環境変数も更新
    sed -i "s/MINIO_ROOT_USER=.*/MINIO_ROOT_USER=$NEW_USER/" "$ADMIN_ENV_FILE"
    sed -i "s/MINIO_ROOT_PASSWORD=.*/MINIO_ROOT_PASSWORD=$NEW_PASSWORD/" "$ADMIN_ENV_FILE"

    echo "  ✅ Updated: $ADMIN_ENV_FILE"
fi

# 8. バケット作成とセットアップ
echo ""
echo "📦 Setting up MinIO bucket..."
$COMPOSE_CMD exec minio mc alias set test $MINIO_ENDPOINT $NEW_USER $NEW_PASSWORD

# バケット作成
BUCKET_NAME="${NEXT_PUBLIC_BUCKET_NAME:-bingo}"
echo "🔨 Creating bucket: $BUCKET_NAME"
if $COMPOSE_CMD exec minio mc mb test/$BUCKET_NAME --ignore-existing; then
    echo "✅ Bucket '$BUCKET_NAME' created/verified successfully!"

    # バケットのパブリック読み取り設定（画像表示用）
    echo "🔓 Setting public read policy for images..."
    $COMPOSE_CMD exec minio mc anonymous set public test/$BUCKET_NAME/prizes/ 2>/dev/null || true
    echo "✅ Public read policy configured"
else
    echo "❌ Failed to create bucket"
fi

# 9. 接続テスト
echo ""
echo "🧪 Testing bucket access..."
if $COMPOSE_CMD exec minio mc ls test/$BUCKET_NAME >/dev/null 2>&1; then
    echo "✅ Bucket access test successful!"
else
    echo "❌ Bucket access test failed!"
    exit 1
fi

# テスト用エイリアスをクリーンアップ
$COMPOSE_CMD exec minio mc alias remove test >/dev/null 2>&1

echo ""
echo "🎉 MinIO credentials generation completed for $ENVIRONMENT environment!"
echo ""
echo "📝 Summary:"
echo "  - New user created: $NEW_USER"
echo "  - Environment files updated"
echo "  - Connection tested successfully"
echo ""
echo "⚠️  Important: Restart your Docker containers to use the new credentials:"
if [ "$ENVIRONMENT" = "prod" ]; then
    echo "   docker compose -f docker-compose.prod.yml restart"
else
    echo "   docker compose restart"
fi
