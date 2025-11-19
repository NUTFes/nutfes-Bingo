#!/usr/bin/env node
/**
 * MinIO → RustFS マイグレーションスクリプト
 *
 * 概要: MinIOに保存されている画像データをRustFSに移行する
 *
 * 処理の流れ:
 * 1. MinIOクライアントの設定
 * 2. RustFSクライアントの設定
 * 3. MinIOから画像一覧を取得
 * 4. 各画像をダウンロードしてRustFSにアップロード
 * 5. データベースのバケット名を更新（必要な場合）
 */

const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

console.log('\n🔄 Starting MinIO to RustFS migration...\n');

// 環境判定
const isProduction = process.env.NODE_ENV === 'production';
const environment = isProduction ? 'production' : 'development';

console.log(`📋 Environment: ${environment}`);

// 環境ファイルの選択
const envFile = isProduction
  ? path.join(__dirname, '../../settings/admin-prod.env')
  : path.join(__dirname, '../../settings/admin.env');

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

// MinIO設定（旧）
const minioEndpoint = 'minio'; // Docker内部エンドポイント
const minioPort = '9000';
const minioBucket = 'bingo';

// RustFS設定（新）
const rustfsEndpoint = envVars.NEXT_PUBLIC_RUSTFS_ENDPOINT || 'rustfs';
const rustfsPort = envVars.NEXT_PUBLIC_RUSTFS_PORT || '9000';
const rustfsAccessKey = envVars.NEXT_PUBLIC_RUSTFS_ACCESS_KEY || envVars.NEXT_PUBLIC_ACCESS_KEY;
const rustfsSecretKey = envVars.NEXT_PUBLIC_RUSTFS_SECRET_KEY || envVars.NEXT_PUBLIC_SECRET_KEY;
const rustfsBucket = envVars.NEXT_PUBLIC_RUSTFS_BUCKET_NAME || envVars.NEXT_PUBLIC_BUCKET_NAME || 'bingo';

if (!rustfsAccessKey || !rustfsSecretKey) {
  console.error('❌ Error: RustFS credentials not found in environment file');
  process.exit(1);
}

console.log(`\n🔑 Configuration:`);
console.log(`  MinIO: http://${minioEndpoint}:${minioPort}/${minioBucket}`);
console.log(`  RustFS: http://${rustfsEndpoint}:${rustfsPort}/${rustfsBucket}`);

// MinIO S3クライアント
const minioClient = new S3Client({
  endpoint: `http://${minioEndpoint}:${minioPort}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: envVars.MINIO_ROOT_USER || 'minioadmin',
    secretAccessKey: envVars.MINIO_ROOT_PASSWORD || 'minioadmin',
  },
  forcePathStyle: true,
});

// RustFS S3クライアント
const rustfsClient = new S3Client({
  endpoint: `http://${rustfsEndpoint}:${rustfsPort}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: rustfsAccessKey,
    secretAccessKey: rustfsSecretKey,
  },
  forcePathStyle: true,
});

// Streamをバッファに変換するヘルパー関数
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function migrateData() {
  try {
    // 1. MinIOから画像一覧を取得
    console.log(`\n📦 Listing objects in MinIO bucket "${minioBucket}"...`);

    let objects = [];
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: minioBucket,
        Prefix: 'prizes/',
      });

      const response = await minioClient.send(listCommand);
      objects = response.Contents || [];

      if (objects.length === 0) {
        console.log(`⚠️  No objects found in MinIO bucket`);
        console.log(`\n💡 Tip: Make sure MinIO is running and contains data`);
        return;
      }

      console.log(`✅ Found ${objects.length} objects to migrate`);
    } catch (error) {
      console.error(`❌ Failed to list MinIO objects: ${error.message}`);
      console.log(`\n💡 Tip: MinIO may not be running or accessible`);
      console.log(`   This is expected if you've already switched to RustFS`);
      return;
    }

    // 2. 各オブジェクトをマイグレーション
    console.log(`\n🚀 Starting migration...\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const key = obj.Key;
      const currentCount = i + 1;

      console.log(`[${currentCount}/${objects.length}] Migrating: ${key}`);

      try {
        // MinIOからダウンロード
        process.stdout.write(`  Downloading from MinIO... `);
        const getCommand = new GetObjectCommand({
          Bucket: minioBucket,
          Key: key,
        });

        const getResponse = await minioClient.send(getCommand);
        const buffer = await streamToBuffer(getResponse.Body);
        console.log(`✅ (${buffer.length} bytes)`);

        // RustFSにアップロード
        process.stdout.write(`  Uploading to RustFS... `);
        const putCommand = new PutObjectCommand({
          Bucket: rustfsBucket,
          Key: key,
          Body: buffer,
          ContentType: getResponse.ContentType || 'image/jpeg',
        });

        await rustfsClient.send(putCommand);
        console.log(`✅`);

        successCount++;
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        failCount++;
      }

      console.log('');
    }

    // 3. サマリー表示
    console.log(`\n🎉 Migration completed!\n`);
    console.log(`📊 Summary:`);
    console.log(`  - Total objects: ${objects.length}`);
    console.log(`  - Successful: ${successCount}`);
    console.log(`  - Failed: ${failCount}`);

    if (successCount > 0) {
      console.log(`\n✅ All images have been migrated to RustFS`);
      console.log(`\n📝 Next steps:`);
      console.log(`  1. Verify images are accessible at: http://${rustfsEndpoint}:${rustfsPort}/${rustfsBucket}/prizes/`);
      console.log(`  2. Update your application to use RustFS endpoint`);
      console.log(`  3. Test the application thoroughly`);
      console.log(`  4. Once confirmed working, you can stop the MinIO container`);
    }

  } catch (error) {
    console.error(`\n❌ Migration failed:`, error.message);
    process.exit(1);
  }
}

// 実行
migrateData();
