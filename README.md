# nutfes-Bingo

技大祭当日に使うビンゴアプリです。

## Branch 命名規則

新機能の Branch 名：feature/issue○○/title[isuue の簡単な説明]

修正の Branch 名：fix/issue○○/title[issue の簡単な説明]

## PR 命名規則

新機能：[add] title

編集・修正：[fix] title

削除：[del] title

## セットアップ

### オブジェクトストレージ

このアプリケーションは、景品画像の管理に RustFS という高性能な S3 互換オブジェクトストレージシステムを使用しています。

### 基本的なセットアップ

完全なセットアップ（RustFS の初期化を含む）:

```bash
make setup
```

これにより以下が実行されます:
1. すべての Docker コンテナを起動（RustFS を含む）
2. 必要なバケットと権限を持つ RustFS を初期化
3. サンプル景品画像をシード

### 手動セットアップ

個別にセットアップする場合:

```bash
# サービスを起動
docker compose up -d

# RustFS を初期化
make setup-rustfs

# 設定を適用するため再起動
docker compose restart

# 画像をシード
make seed-images
```

### RustFS コンソールへのアクセス

RustFS Web コンソールは http://localhost:9001 で利用できます

デフォルトの認証情報は `settings/admin.env` で定義されています:
- ユーザー名: admin
- パスワード: （env ファイルの RUSTFS_ROOT_PASSWORD を参照）

## 実装メモ

- `next: permission denied`が出る時の対処法
  - `docker compose run --rm [コンテナ名] bash` でそのコンテナに入る
  - `chown +x -R .`　で実行権限を与える
  - `exit`でそのコンテナから出る

### オブジェクトストレージについて

- RustFS は S3 互換の API を提供し、AWS SDK v3 を使用してアクセスされます
- 認証情報は `api/seeds/setup_rustfs.js` で自動生成されます
- 環境変数ファイル (`settings/admin.env`, `settings/admin-prod.env`) は自動的に更新されます
- バケット作成と公開読み取りポリシーの設定も自動的に行われます

### スクリプトの役割分担
- `api/seeds/setup_rustfs.js`: RustFS 環境セットアップ（認証情報生成 + バケット作成）
- `api/seeds/seed_images_rustfs.js`: データ投入のみ（画像アップロード）

### レガシー MinIO コマンド

以前の MinIO ベースのコマンドは非推奨となりました:
- `make generate-minio-keys` → `make setup-rustfs` を使用してください
- `make seed` → `make seed-images` を使用してください
