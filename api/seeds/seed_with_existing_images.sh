#!/bin/bash

# =============================================================================
# 景品画像Seedデータ作成スクリプト
# =============================================================================
# 概要: リポジトリ内の既存景品画像をMinIOにアップロードし、
#       Hasuraデータベースにimagesとprizesテーブルのseedデータを作成する
#
# 処理の流れ:
# 1. 環境変数の読み込み (bingo.env)
# 2. MinIOクライアントの設定
# 3. view-user/public/PrizeItem/内の画像を順次処理:
#    - MinIOにアップロード (prizes/ディレクトリ配下)
#    - imagesテーブルにメタデータ登録
#    - prizesテーブルに景品情報登録
# 4. 作成結果のサマリー表示

set -e  # エラー時に停止

# 環境変数の読み込み
ENV_FILE="../../settings/bingo.env"
if [ -f "$ENV_FILE" ]; then
    # カンマやスペースを含む値でもエラーが出ないように修正
    set -a  # 自動export有効
    source "$ENV_FILE"
    set +a  # 自動export無効
else
    echo "Error: Environment file $ENV_FILE not found"
    exit 1
fi

# MinIO設定
MINIO_ENDPOINT="${NEXT_PUBLIC_MINIO_ENDPOINT}"
BUCKET_NAME="${NEXT_PUBLIC_BUCKET_NAME}"
ACCESS_KEY="${NEXT_PUBLIC_ACCESS_KEY}"
SECRET_KEY="${NEXT_PUBLIC_SECRET_KEY}"
HASURA_ENDPOINT="${API_URI}/v1/graphql"
HASURA_METADATA_ENDPOINT="${API_URI}/v1/metadata"
ADMIN_SECRET="${HASURA_GRAPHQL_ADMIN_SECRET}"

# 画像ディレクトリ
PRIZE_IMAGES_DIR="view-user/public/PrizeItem"

# 景品名配列（ファイル番号01-31に対応）
declare -a PRIZE_NAMES_JP=(
    "Apple Watch SE"
    "黒毛和牛1kg"
    "選べるペアチケット"
    "コーヒーメーカー"
    "缶つま"
    "朝日山 天籟 越淡麗 純米大吟醸"
    "折りたたみ自転車"
    "焼肉プレート"
    "ジバニャン着ぐるみ"
    "チュッパチャプス200本ツリー"
    "技大セット"
    "瓶コーラ12本セット"
    "魚沼産コシヒカリ(2kg)"
    "着る毛布(サメ)"
    "駄菓子 詰め合わせセット"
    "トトロクッション"
    "ハンディファン"
    "サウナハット"
    "ご飯が炊ける弁当箱"
    "人生ゲームゴールデンドリーム"
    "寝袋"
    "ソーダストリーム"
    "ナブラ演算子ゲーム"
    "ダンベル"
    "ニュートンのゆりかご"
    "日めくりカレンダー(毎日アンミカ)"
    "セクシー大根抱き枕"
    "ペッパーミル"
    "ザコシショウ来学記念セット"
    "巨大クマのぬいぐるみ"
    "ハーゲンダッツ詰め合わせ"
)

declare -a PRIZE_NAMES_EN=(
    "Apple Watch SE"
    "Kuroge Wagyu 1kg"
    "Selectable Pair Ticket"
    "Coffee Maker"
    "Canned Delicacies"
    "Asahiyama Tenrai Junmai Daiginjo"
    "Folding Bicycle"
    "BBQ Grill Plate"
    "Jibanyan Costume"
    "Chupa Chups 200 Tree"
    "NUTEC Set"
    "Bottled Coke 12 Set"
    "Uonuma Koshihikari Rice (2kg)"
    "Wearable Blanket (Shark)"
    "Assorted Snacks Set"
    "Totoro Cushion"
    "Handy Fan"
    "Sauna Hat"
    "Rice Cooker Lunch Box"
    "Game of Life Golden Dream"
    "Sleeping Bag"
    "SodaStream"
    "Nabla Operator Game"
    "Dumbbell"
    "Newton's Cradle"
    "Daily Calendar (Anmika)"
    "Sexy Radish Pillow"
    "Pepper Mill"
    "Zakoshi Show Memorial Set"
    "Giant Bear Plushie"
    "Haagen-Dazs Assortment"
)

echo "🚀 Starting seed data creation with existing images..."

# 1. MinIOクライアントの設定（データ操作用）
# 前提条件: generate_minio_credentials.sh でMinIO環境が適切にセットアップ済み
echo "🔑 Setting up MinIO client for data operations..."
docker compose exec api mc alias set local $MINIO_ENDPOINT $ACCESS_KEY $SECRET_KEY

# 2. 画像のアップロードとDB登録
echo "📷 Uploading images and registering to database..."

# 実際の画像ファイルを確認
echo "🔍 Checking available image files..."
cd ../../
if [ ! -d "$PRIZE_IMAGES_DIR" ]; then
    echo "❌ Directory not found: $PRIZE_IMAGES_DIR"
    exit 1
fi

# 実際に存在するファイルを動的に取得
available_files=$(find "$PRIZE_IMAGES_DIR" -name "*.jpg" -exec basename {} \; 2>/dev/null | sort)
cd api/seeds

if [ -z "$available_files" ]; then
    echo "❌ No image files found in $PRIZE_IMAGES_DIR"
    exit 1
fi

# ファイルリストを配列に変換
mapfile -t test_files <<< "$available_files"

total_count=${#test_files[@]}
current_count=0

echo "Processing $total_count files..."

# テストファイルを処理
for filename in "${test_files[@]}"; do
    # 個別の処理では set -e を一時的に無効にして続行
    set +e

    ((current_count++))

    # ファイル名をプリントして確認
    echo "Processing file $current_count/$total_count: '$filename'"

    # ファイル名から番号を抽出（01-31）
    file_number=$(echo "$filename" | grep -o '^[0-9]\+' | sed 's/^0*//')

    # 配列のインデックスは0ベースなので1を引く
    array_index=$((file_number - 1))

    # 配列から景品名を取得
    if [ $array_index -ge 0 ] && [ $array_index -lt ${#PRIZE_NAMES_JP[@]} ]; then
        name_jp="${PRIZE_NAMES_JP[$array_index]}"
        name_en="${PRIZE_NAMES_EN[$array_index]}"
        echo "  Prize names: JP='$name_jp', EN='$name_en'"
    else
        echo "  Warning: File number $file_number is out of range, using fallback names"
        name_jp="景品 $file_number"
        name_en="Prize $file_number"
    fi

    # ファイル名のクリーンアップ（MinIOアップロード用）
    clean_filename=$(echo "$filename" | sed "s/^'//; s/'$//")

    # ファイル名に特殊文字が含まれる場合のための安全な処理
    # Docker内でのファイルパス（クォートで適切に囲む）
    source_path="/hasura/project/$PRIZE_IMAGES_DIR/$filename"
    dest_path="local/$BUCKET_NAME/prizes/$clean_filename"

    echo -n "  Uploading $name_jp to MinIO... "

    # MinIOに画像をアップロード（特殊文字対応のためprintf使用）
    upload_result=$(docker compose exec api sh -c "mc cp '$source_path' '$dest_path'" 2>&1)
    upload_exit_code=$?

    if [ $upload_exit_code -eq 0 ]; then
        echo "✅ Uploaded"

        # ファイル拡張子を取得
        file_extension="${clean_filename##*.}"

        # MinIOでのファイル名（prizes/プレフィックス付き）
        minio_filename="prizes/$clean_filename"

        echo -n "  Registering image to database... "
        # imagesテーブルに登録（既存チェック後に挿入）
        escaped_bucket=$(printf '%s' "$BUCKET_NAME" | sed 's/"/\\"/g')
        escaped_filename=$(printf '%s' "$minio_filename" | sed 's/"/\\"/g')
        escaped_extension=$(printf '%s' "$file_extension" | sed 's/"/\\"/g')

        # 既存の画像をチェック
        existing_image_response=$(curl -s -X POST \
          "$HASURA_ENDPOINT" \
          -H "Content-Type: application/json" \
          -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
          -d "{\"query\":\"query { images(where: {fileName: {_eq: \\\"$escaped_filename\\\"}}) { id } }\"}")

        # GraphQLレスポンスのエラーチェック
        if echo "$existing_image_response" | grep -q '"errors"'; then
            echo "❌ GraphQL error in image check"
            echo "    Response: $existing_image_response"
        else
            existing_image_id=$(echo "$existing_image_response" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

            if [ ! -z "$existing_image_id" ]; then
                image_id="$existing_image_id"
                echo "✅ Image already exists ID: $image_id"
            else
                # 新規作成
                image_response=$(curl -s -X POST \
                  "$HASURA_ENDPOINT" \
                  -H "Content-Type: application/json" \
                  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
                  -d "{\"query\":\"mutation { insertImagesOne(object: {bucketName: \\\"$escaped_bucket\\\", fileName: \\\"$escaped_filename\\\", fileType: \\\"$escaped_extension\\\"}) { id } }\"}")

                # GraphQLレスポンスのエラーチェック
                if echo "$image_response" | grep -q '"errors"'; then
                    echo "❌ GraphQL error in image creation"
                    echo "    Response: $image_response"
                    image_id=""
                else
                    image_id=$(echo "$image_response" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

                    if [ ! -z "$image_id" ]; then
                        echo "✅ Image created ID: $image_id"
                    else
                        echo "❌ Image registration failed"
                        echo "    Response: $image_response"
                        image_id=""
                    fi
                fi
            fi

            # 画像IDが取得できた場合のみ、景品を登録
            if [ ! -z "$image_id" ]; then
                echo -n "  Registering prize to database... "
                # prizesテーブルに登録（既存チェック後に挿入）

                # 既存の景品をチェック
                existing_prize_response=$(curl -s -X POST \
                  "$HASURA_ENDPOINT" \
                  -H "Content-Type: application/json" \
                  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
                  -d "{\"query\":\"query { prizes(where: {imageId: {_eq: $image_id}}) { id } }\"}")

                # GraphQLレスポンスのエラーチェック
                if echo "$existing_prize_response" | grep -q '"errors"'; then
                    echo "❌ GraphQL error in prize check"
                    echo "    Response: $existing_prize_response"
                else
                    existing_prize_id=$(echo "$existing_prize_response" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

                    if [ ! -z "$existing_prize_id" ]; then
                        echo "✅ Prize already exists ID: $existing_prize_id"
                    else
                        # 新規作成（JSONエスケープ）
                        escaped_name_jp=$(printf '%s' "$name_jp" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
                        escaped_name_en=$(printf '%s' "$name_en" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')

                        prize_response=$(curl -s -X POST \
                          "$HASURA_ENDPOINT" \
                          -H "Content-Type: application/json" \
                          -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
                          -d "{\"query\":\"mutation { insertPrizesOne(object: {imageId: $image_id, nameJp: \\\"$escaped_name_jp\\\", nameEn: \\\"$escaped_name_en\\\", isWon: false}) { id } }\"}")

                        # GraphQLレスポンスのエラーチェック
                        if echo "$prize_response" | grep -q '"errors"'; then
                            echo "❌ GraphQL error in prize creation"
                            echo "    Response: $prize_response"
                        else
                            prize_id=$(echo "$prize_response" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

                            if [ ! -z "$prize_id" ]; then
                                echo "✅ Prize created ID: $prize_id"
                            else
                                echo "❌ Prize registration failed"
                                echo "    Response: $prize_response"
                            fi
                        fi
                    fi
                fi
            fi
        fi
    else
        echo "❌ Upload failed (exit code: $upload_exit_code)"
        echo "    Error: $upload_result"
        echo "    Source: '$source_path'"
        echo "    Dest: '$dest_path'"

        # ファイルが存在するかチェック
        if docker compose exec api test -f "$source_path"; then
            echo "    File exists in container"
        else
            echo "    File NOT found in container"
        fi
    fi
    echo ""

    # 個別処理完了後、set -e を再度有効にする
    set -e
done

echo ""
echo "🎉 Seed data creation completed!"
echo "📊 Summary:"

# 結果のサマリーを表示（正しいフィールド名を使用）
images_response=$(curl -s -X POST \
  "$HASURA_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{"query": "query { imagesAggregate { aggregate { count } } }"}')

images_count=$(echo "$images_response" | grep -o '"count"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*')

prizes_response=$(curl -s -X POST \
  "$HASURA_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{"query": "query { prizesAggregate { aggregate { count } } }"}')

prizes_count=$(echo "$prizes_response" | grep -o '"count"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*')

echo "  - Images uploaded: $images_count"
echo "  - Prizes registered: $prizes_count"
echo ""
echo "🔗 You can now access the images at: $MINIO_ENDPOINT/$BUCKET_NAME/prizes/"
