#!/usr/bin/env node
/**
 * RustFS環境セットアップスクリプト
 *
 * 概要: AWS SDK v3を使用してRustFSに接続し、バケットをセットアップする
 *
 * 処理の流れ:
 * 1. 環境変数の読み込み
 * 2. RustFS (S3互換) クライアントの設定
 * 3. バケットの作成（既に存在する場合はスキップ）
 * 4. 公開読み取りポリシーの設定
 * 5. 接続テスト
 */

const { S3Client, CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

console.log('\n🚀 Starting RustFS setup...\n');

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

// RustFS設定
const endpoint = envVars.NEXT_PUBLIC_RUSTFS_ENDPOINT || 'rustfs';
const port = envVars.NEXT_PUBLIC_RUSTFS_PORT || '9000';
const accessKey = envVars.NEXT_PUBLIC_RUSTFS_ACCESS_KEY || envVars.NEXT_PUBLIC_ACCESS_KEY;
const secretKey = envVars.NEXT_PUBLIC_RUSTFS_SECRET_KEY || envVars.NEXT_PUBLIC_SECRET_KEY;
const bucketName = envVars.NEXT_PUBLIC_RUSTFS_BUCKET_NAME || envVars.NEXT_PUBLIC_BUCKET_NAME || 'bingo';

if (!accessKey || !secretKey) {
  console.error('❌ Error: Access key or secret key not found in environment file');
  process.exit(1);
}

console.log(`\n🔑 RustFS Configuration:`);
console.log(`  Endpoint: http://${endpoint}:${port}`);
console.log(`  Bucket: ${bucketName}`);
console.log(`  Access Key: ${accessKey.substring(0, 8)}...`);

// S3クライアントを作成
const s3Client = new S3Client({
  endpoint: `http://${endpoint}:${port}`,
  region: 'us-east-1', // RustFS (S3互換) では任意のリージョンでOK
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
  forcePathStyle: true, // S3互換ストレージでは必須
});

async function setupRustFS() {
  try {
    // 1. バケットの存在確認
    console.log(`\n📦 Checking if bucket "${bucketName}" exists...`);
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      console.log(`✅ Bucket "${bucketName}" already exists`);
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        // バケットが存在しない場合は作成
        console.log(`📦 Creating bucket "${bucketName}"...`);
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log(`✅ Bucket "${bucketName}" created successfully`);
      } else {
        throw error;
      }
    }

    // 2. 公開読み取りポリシーの設定（画像表示用）
    console.log(`\n🔓 Setting public read policy for images...`);
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${bucketName}/prizes/*`,
        },
      ],
    };

    try {
      await s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: bucketName,
          Policy: JSON.stringify(policy),
        })
      );
      console.log(`✅ Public read policy configured`);
    } catch (error) {
      console.log(`⚠️  Warning: Could not set bucket policy (may not be supported): ${error.message}`);
    }

    // 3. 接続テスト
    console.log(`\n🧪 Testing bucket access...`);
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`✅ Bucket access test successful!`);

    console.log(`\n🎉 RustFS setup completed for ${environment} environment!`);
    console.log(`\n📝 Summary:`);
    console.log(`  - Bucket: ${bucketName}`);
    console.log(`  - Endpoint: http://${endpoint}:${port}`);
    console.log(`  - Status: Ready for use`);
    console.log(`\n🔗 Access RustFS Console at: http://localhost:9001`);

  } catch (error) {
    console.error(`\n❌ Setup failed:`, error.message);
    if (error.$metadata) {
      console.error(`   HTTP Status: ${error.$metadata.httpStatusCode}`);
    }
    process.exit(1);
  }
}

// 実行
setupRustFS();
