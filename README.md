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

### 基本的なセットアップ

```bash
make setup
```

### MinIO 認証情報を新規生成してセットアップ

```bash
make setup-with-new-keys
```

### MinIO 認証情報のみ生成

```bash
make generate-minio-keys
```

## 実装メモ

- `next: permission denied`が出る時の対処法
  - `docker compose run --rm [コンテナ名] bash` でそのコンテナに入る
  - `chown +x -R .`　で実行権限を与える
  - `exit`でそのコンテナから出る

### MinIO 認証情報について

- MinIO のアクセスキーとシークレットキーは `api/seeds/generate_minio_credentials.sh` で自動生成可能
- GUI 操作不要で、mc コマンドを使用して認証情報を生成・更新
- 環境変数ファイル (`settings/bingo.env`, `settings/admin.env`) は自動的にバックアップ・更新される
- **バケット作成も認証情報生成時に自動実行される**

### スクリプトの役割分担
- `generate_minio_credentials.sh`: MinIO 環境セットアップ（認証情報生成 + バケット作成）
- `seed_with_existing_images.sh`: データ投入のみ（画像アップロード + DB 登録）
