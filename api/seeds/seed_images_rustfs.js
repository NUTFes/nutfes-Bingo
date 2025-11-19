#!/usr/bin/env node
/**
 * 景品画像Seedデータ作成スクリプト (RustFS版)
 *
 * 概要: リポジトリ内の既存景品画像をRustFSにアップロードし、
 *       Hasuraデータベースにimagesとprizesテーブルのseedデータを作成する
 *
 * 処理の流れ:
 * 1. 環境変数の読み込み
 * 2. RustFS (S3互換) クライアントの設定
 * 3. view-user/public/PrizeItem/内の画像を順次処理:
 *    - RustFSにアップロード (prizes/ディレクトリ配下)
 *    - imagesテーブルにメタデータ登録
 *    - prizesテーブルに景品情報登録
 * 4. 作成結果のサマリー表示
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('\n🌱 Starting seed data creation with RustFS...\n');

// 環境判定
const isProduction = process.env.NODE_ENV === 'production';
const environment = isProduction ? 'production' : 'development';

console.log(`📋 Environment: ${environment}`);

// 環境ファイルの選択
const envFile = isProduction
  ? path.join(__dirname, '../../settings/bingo-prod.env')
  : path.join(__dirname, '../../settings/bingo.env');

if (!fs.existsSync(envFile)) {
  console.error(`❌ Error: Environment file not found: ${envFile}`);
  process.exit(1);
}

// 環境変数を読み込み
console.log(`📖 Loading environment from: ${envFile}`);
const envContent = fs.readFileSync(envFile, 'utf-8');

// 環境変数をパース
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=["']?([^"']+)["']?$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

// RustFS設定
const endpoint = envVars.NEXT_PUBLIC_RUSTFS_ENDPOINT || 'rustfs';
const port = envVars.NEXT_PUBLIC_RUSTFS_PORT || '9000';
const accessKey = envVars.NEXT_PUBLIC_RUSTFS_ACCESS_KEY || envVars.NEXT_PUBLIC_ACCESS_KEY;
const secretKey = envVars.NEXT_PUBLIC_RUSTFS_SECRET_KEY || envVars.NEXT_PUBLIC_SECRET_KEY;
const bucketName = envVars.NEXT_PUBLIC_RUSTFS_BUCKET_NAME || envVars.NEXT_PUBLIC_BUCKET_NAME || 'bingo';

// Hasura設定
const hasuraEndpoint = 'http://localhost:8080/v1/graphql';
const hasuraAdminSecret = isProduction ? '/4XQdRUHXGtW' : 'myadminsecretkey';

// 画像ディレクトリ
const prizeImagesDir = path.join(__dirname, '../../view-user/public/PrizeItem');

// 景品名配列（ファイル番号01-31に対応）
const prizeNamesJp = [
  "Apple Watch SE",
  "黒毛和牛1kg",
  "選べるペアチケット",
  "コーヒーメーカー",
  "缶つま",
  "朝日山 天籟 越淡麗 純米大吟醸",
  "折りたたみ自転車",
  "焼肉プレート",
  "ジバニャン着ぐるみ",
  "チュッパチャプス200本ツリー",
  "技大セット",
  "瓶コーラ12本セット",
  "魚沼産コシヒカリ(2kg)",
  "着る毛布(サメ)",
  "駄菓子 詰め合わせセット",
  "トトロクッション",
  "ハンディファン",
  "サウナハット",
  "ご飯が炊ける弁当箱",
  "人生ゲームゴールデンドリーム",
  "寝袋",
  "ソーダストリーム",
  "ナブラ演算子ゲーム",
  "ダンベル",
  "ニュートンのゆりかご",
  "日めくりカレンダー(毎日アンミカ)",
  "セクシー大根抱き枕",
  "ペッパーミル",
  "ザコシショウ来学記念セット",
  "巨大クマのぬいぐるみ",
  "ハーゲンダッツ詰め合わせ",
];

const prizeNamesEn = [
  "Apple Watch SE",
  "Kuroge Wagyu 1kg",
  "Selectable Pair Ticket",
  "Coffee Maker",
  "Canned Delicacies",
  "Asahiyama Tenrai Junmai Daiginjo",
  "Folding Bicycle",
  "BBQ Grill Plate",
  "Jibanyan Costume",
  "Chupa Chups 200 Tree",
  "NUTEC Set",
  "Bottled Coke 12 Set",
  "Uonuma Koshihikari Rice (2kg)",
  "Wearable Blanket (Shark)",
  "Assorted Snacks Set",
  "Totoro Cushion",
  "Handy Fan",
  "Sauna Hat",
  "Rice Cooker Lunch Box",
  "Game of Life Golden Dream",
  "Sleeping Bag",
  "SodaStream",
  "Nabla Operator Game",
  "Dumbbell",
  "Newton's Cradle",
  "Daily Calendar (Anmika)",
  "Sexy Radish Pillow",
  "Pepper Mill",
  "Zakoshi Show Memorial Set",
  "Giant Bear Plushie",
  "Haagen-Dazs Assortment",
];

// S3クライアントを作成
const s3Client = new S3Client({
  endpoint: `http://${endpoint}:${port}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
  forcePathStyle: true,
});

// GraphQLリクエストを送信するヘルパー関数
function sendGraphQLRequest(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/v1/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'X-Hasura-Admin-Secret': hasuraAdminSecret,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.errors) {
            reject(new Error(`GraphQL Error: ${JSON.stringify(response.errors)}`));
          } else {
            resolve(response.data);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function seedImages() {
  try {
    console.log(`\n🔍 Checking available image files...`);

    if (!fs.existsSync(prizeImagesDir)) {
      console.error(`❌ Directory not found: ${prizeImagesDir}`);
      process.exit(1);
    }

    // 実際に存在するファイルを取得
    const files = fs.readdirSync(prizeImagesDir)
      .filter(f => f.endsWith('.jpg'))
      .sort();

    if (files.length === 0) {
      console.error(`❌ No image files found in ${prizeImagesDir}`);
      process.exit(1);
    }

    console.log(`📷 Found ${files.length} image files`);
    console.log(`\n🚀 Starting upload and registration...\n`);

    for (let i = 0; i < files.length; i++) {
      const filename = files[i];
      const currentCount = i + 1;

      console.log(`[${currentCount}/${files.length}] Processing: ${filename}`);

      // ファイル名から番号を抽出
      const fileNumber = parseInt(filename.match(/^(\d+)/)?.[1] || '0', 10);
      const arrayIndex = fileNumber - 1;

      // 景品名を取得
      const nameJp = prizeNamesJp[arrayIndex] || `景品 ${fileNumber}`;
      const nameEn = prizeNamesEn[arrayIndex] || `Prize ${fileNumber}`;

      console.log(`  Prize: ${nameJp}`);

      try {
        // 1. 画像をRustFSにアップロード
        const filePath = path.join(prizeImagesDir, filename);
        const fileContent = fs.readFileSync(filePath);
        const s3Key = `prizes/${filename}`;

        process.stdout.write(`  Uploading to RustFS... `);
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: fileContent,
            ContentType: 'image/jpeg',
          })
        );
        console.log(`✅`);

        // 2. imagesテーブルに登録
        const fileExtension = path.extname(filename).substring(1);

        process.stdout.write(`  Registering image to database... `);

        // 既存の画像をチェック
        const checkImageQuery = `
          query {
            images(where: {fileName: {_eq: "${s3Key}"}}) {
              id
            }
          }
        `;

        const checkImageResult = await sendGraphQLRequest(checkImageQuery);

        let imageId;
        if (checkImageResult.images && checkImageResult.images.length > 0) {
          imageId = checkImageResult.images[0].id;
          console.log(`✅ (exists: ${imageId})`);
        } else {
          // 新規作成
          const createImageQuery = `
            mutation {
              insertImagesOne(object: {
                bucketName: "${bucketName}",
                fileName: "${s3Key}",
                fileType: "${fileExtension}"
              }) {
                id
              }
            }
          `;

          const createImageResult = await sendGraphQLRequest(createImageQuery);
          imageId = createImageResult.insertImagesOne.id;
          console.log(`✅ (created: ${imageId})`);
        }

        // 3. prizesテーブルに登録
        process.stdout.write(`  Registering prize to database... `);

        // 既存の景品をチェック
        const checkPrizeQuery = `
          query {
            prizes(where: {imageId: {_eq: ${imageId}}}) {
              id
            }
          }
        `;

        const checkPrizeResult = await sendGraphQLRequest(checkPrizeQuery);

        if (checkPrizeResult.prizes && checkPrizeResult.prizes.length > 0) {
          const prizeId = checkPrizeResult.prizes[0].id;
          console.log(`✅ (exists: ${prizeId})`);
        } else {
          // 新規作成（特殊文字をエスケープ）
          const escapedNameJp = nameJp.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          const escapedNameEn = nameEn.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

          const createPrizeQuery = `
            mutation {
              insertPrizesOne(object: {
                imageId: ${imageId},
                nameJp: "${escapedNameJp}",
                nameEn: "${escapedNameEn}",
                isWon: false
              }) {
                id
              }
            }
          `;

          const createPrizeResult = await sendGraphQLRequest(createPrizeQuery);
          const prizeId = createPrizeResult.insertPrizesOne.id;
          console.log(`✅ (created: ${prizeId})`);
        }

      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
      }

      console.log('');
    }

    // サマリー表示
    console.log(`\n🎉 Seed data creation completed!\n`);
    console.log(`📊 Summary:`);

    const imagesCountQuery = `
      query {
        imagesAggregate {
          aggregate {
            count
          }
        }
      }
    `;

    const prizesCountQuery = `
      query {
        prizesAggregate {
          aggregate {
            count
          }
        }
      }
    `;

    const imagesResult = await sendGraphQLRequest(imagesCountQuery);
    const prizesResult = await sendGraphQLRequest(prizesCountQuery);

    console.log(`  - Images uploaded: ${imagesResult.imagesAggregate.aggregate.count}`);
    console.log(`  - Prizes registered: ${prizesResult.prizesAggregate.aggregate.count}`);
    console.log(`\n🔗 You can now access the images at: http://${endpoint}:${port}/${bucketName}/prizes/`);

  } catch (error) {
    console.error(`\n❌ Seed failed:`, error.message);
    process.exit(1);
  }
}

// 実行
seedImages();
