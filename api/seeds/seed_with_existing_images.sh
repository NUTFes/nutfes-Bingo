#!/bin/bash

# =============================================================================
# 景品画像Seedデータ作成スクリプト
# =============================================================================
# 概要: リポジトリ内の既存景品画像をMinIOにアップロードし、
#       Hasuraデータベースにimagesとprizesテーブルのseedデータを作成する
#
# 処理の流れ:
# 1. 環境変数の読み込み (bingo.env)
# 2. MinIOバケットの作成・設定
# 3. 既存のimages/prizesデータのクリーンアップ
# 4. view-user/public/PrizeItem/内の画像を順次処理:
#    - MinIOにアップロード (prizes/ディレクトリ配下)
#    - imagesテーブルにメタデータ登録
#    - prizesテーブルに景品情報登録
# 5. 作成結果のサマリー表示

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
ADMIN_SECRET="${HASURA_GRAPHQL_ADMIN_SECRET}"

# 画像ディレクトリ
PRIZE_IMAGES_DIR="view-user/public/PrizeItem"

echo "🚀 Starting seed data creation with existing images..."

# 1. MinIOクライアントの設定とバケット作成（Docker経由）
echo "📦 Setting up MinIO client and creating bucket..."
docker compose exec api mc alias set local $MINIO_ENDPOINT $ACCESS_KEY $SECRET_KEY
docker compose exec api mc mb local/$BUCKET_NAME --ignore-existing

# 2. 既存データのクリーンアップ
echo "🧹 Cleaning up existing data..."
curl -X POST \
  $HASURA_ENDPOINT \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{
    "type": "run_sql",
    "args": {
      "sql": "DELETE FROM prizes; DELETE FROM images; ALTER SEQUENCE images_id_seq RESTART WITH 1; ALTER SEQUENCE prizes_id_seq RESTART WITH 1;"
    }
  }' > /dev/null

# 3. 画像のアップロードとDB登録
echo "📷 Uploading images and registering to database..."



# 景品データの配列（ファイル名から景品名を抽出）
declare -a prize_data=(
    "01_Apple Watch SE.jpg|Apple Watch SE|Apple Watch SE"
    "02_黒毛和牛1kg.jpg|黒毛和牛1kg|Japanese Wagyu Beef 1kg"
    "03_選べるペアチケット.jpg|選べるペアチケット|Pair Ticket"
    "04_コーヒーメーカー.jpg|コーヒーメーカー|Coffee Maker"
    "05_缶つま.jpg|缶つま|Canned Food Set"
    "06_朝日山 天籟 越淡麗 純米大吟醸.jpg|朝日山 天籟 越淡麗 純米大吟醸|Asahiyama Tenrai Sake"
    "07_折りたたみ自転車.jpg|折りたたみ自転車|Folding Bicycle"
    "08_焼肉プレート.jpg|焼肉プレート|BBQ Plate"
    "09_ジバニャン着ぐるみ.jpg|ジバニャン着ぐるみ|Jibanyan Costume"
    "10_チュッパチャプス200本ツリー.jpg|チュッパチャプス200本ツリー|Chupa Chups Tree 200pcs"
    "11_技大セット.jpg|技大セット|NUT Set"
    "12_瓶コーラ12本セット.jpg|瓶コーラ12本セット|Bottle Cola 12pcs Set"
    "13_魚沼産コシヒカリ(2kg).jpg|魚沼産コシヒカリ(2kg)|Uonuma Koshihikari Rice 2kg"
    "14_着る毛布(サメ).jpg|着る毛布(サメ)|Wearable Blanket (Shark)"
    "15_駄菓子 詰め合わせセット.jpg|駄菓子 詰め合わせセット|Japanese Snack Set"
    "16_トトロクッション.jpg|トトロクッション|Totoro Cushion"
    "17_ハンディファン.jpg|ハンディファン|Handy Fan"
    "18_サウナハット.jpg|サウナハット|Sauna Hat"
    "19_ご飯が炊ける弁当箱.jpg|ご飯が炊ける弁当箱|Rice Cooking Lunch Box"
    "20_人生ゲームゴールデンドリーム.jpg|人生ゲームゴールデンドリーム|Game of Life Golden Dream"
    "21_寝袋.jpg|寝袋|Sleeping Bag"
    "22_ソーダストリーム.jpg|ソーダストリーム|SodaStream"
    "23_ナブラ演算子ゲーム.jpg|ナブラ演算子ゲーム|Nabla Operator Game"
    "24_ダンベル.jpg|ダンベル|Dumbbell"
    "25_ニュートンのゆりかご.jpg|ニュートンのゆりかご|Newton's Cradle"
    "26_日めくりカレンダー(毎日アンミカ）.jpg|日めくりカレンダー(毎日アンミカ）|Daily Calendar (Anmika)"
    "27_セクシー大根抱き枕.jpg|セクシー大根抱き枕|Sexy Radish Body Pillow"
    "28_ペッパーミル.jpg|ペッパーミル|Pepper Mill"
    "29_ザコシショウ来学記念セット.jpg|ザコシショウ来学記念セット|Zakoshi Show Memorial Set"
    "30_巨大クマのぬいぐるみ.jpg|巨大クマのぬいぐるみ|Giant Bear Plushie"
    "31_ハーゲンダッツ詰め合わせ.jpg|ハーゲンダッツ詰め合わせ|Haagen-Dazs Set"
)

# 各画像を処理
total_count=${#prize_data[@]}
current_count=0

for prize_info in "${prize_data[@]}"; do
    ((current_count++))
    IFS='|' read -r filename name_jp name_en <<< "$prize_info"

    # プロジェクトルート内のファイルパス
    source_path="/hasura/project/$PRIZE_IMAGES_DIR/$filename"
    dest_path="local/$BUCKET_NAME/prizes/$filename"

    # ホスト側でファイルの存在確認
    if [ -f "../../$PRIZE_IMAGES_DIR/$filename" ]; then
        echo -n "[$current_count/$total_count] Processing: $name_jp... "

        # MinIOに画像をアップロード
        docker compose exec api sh -c "mc cp '$source_path' '$dest_path'" > /dev/null 2>&1

        # ファイル拡張子を取得
        file_extension="${filename##*.}"

        # imagesテーブルに登録

        # ファイル名のスペースをアンダースコアに置換（安全な方法）
        safe_filename=$(echo "prizes/$filename" | sed 's/ /_/g')

        # シンプルなGraphQLクエリ（変数なし）
        image_response=$(curl -s -X POST \
          $HASURA_ENDPOINT \
          -H "Content-Type: application/json" \
          -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
          -d "{\"query\":\"mutation { insertImagesOne(object: {bucketName: \\\"$BUCKET_NAME\\\", fileName: \\\"$safe_filename\\\", fileType: \\\"$file_extension\\\"}) { id } }\"}")

        # レスポンスからimage_idを抽出
        image_id=$(echo "$image_response" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

        if [ -z "$image_id" ]; then
            echo "❌ Failed to get image ID"
            echo "Response: $image_response"
            continue
        fi

        if [ ! -z "$image_id" ]; then
            # prizesテーブルに登録（特殊文字をエスケープ）
            safe_name_jp=$(echo "$name_jp" | sed 's/"/\\"/g')
            safe_name_en=$(echo "$name_en" | sed 's/"/\\"/g')

            prize_response=$(curl -s -X POST \
              $HASURA_ENDPOINT \
              -H "Content-Type: application/json" \
              -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
              -d "{\"query\":\"mutation { insertPrizesOne(object: {imageId: $image_id, nameJp: \\\"$safe_name_jp\\\", nameEn: \\\"$safe_name_en\\\", isWon: false}) { id } }\"}")

            # prizesのIDを確認
            prize_id=$(echo "$prize_response" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

            if [ ! -z "$prize_id" ]; then
                echo "✅ 完了 ID: $image_id"
            else
                echo "❌ Prize registration failed"
                echo "Response: $prize_response"
            fi
        else
            echo "❌ Failed to insert image"
        fi
    else
        echo "⚠️  [$current_count/$total_count] File not found: $filename"
    fi
done

echo ""
echo "🎉 Seed data creation completed!"
echo "📊 Summary:"

# 結果のサマリーを表示
images_count=$(curl -s -X POST \
  $HASURA_ENDPOINT \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{
    "query": "query { images_aggregate { aggregate { count } } }"
  }' | grep -o '"count":[0-9]*' | grep -o '[0-9]*')

prizes_count=$(curl -s -X POST \
  $HASURA_ENDPOINT \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{
    "query": "query { prizes_aggregate { aggregate { count } } }"
  }' | grep -o '"count":[0-9]*' | grep -o '[0-9]*')

echo "  - Images uploaded: $images_count"
echo "  - Prizes registered: $prizes_count"
echo ""
echo "🔗 You can now access the images at: $MINIO_ENDPOINT/$BUCKET_NAME/prizes/"
