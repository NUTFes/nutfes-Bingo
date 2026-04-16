# nutfes-Bingo

技大祭当日に使うビンゴアプリです。

## 制作背景

### 課題

従来の学園祭ビンゴ大会では、抽選機で排出された番号をホワイトボードに手書きで掲示していました。この運用には以下の課題がありました。

- **視認性の問題**：後方の参加者には文字が見えづらい
- **人員コスト**：板書担当として人員を別途確保する必要がある

### 目的

抽選番号や景品の当選状況を Web 上でリアルタイムに確認できるアプリを作成し、参加者体験の向上と運営の効率化を両立させることを目的としました。

参加者（600〜1000人規模）が自身のスマートフォンから番号を確認できるようにするとともに、会場の大型ディスプレイへの表示、管理者向けの運営機能も提供しています。

---

## 技術選定

### 技術スタック

| レイヤー | 技術 |
|------|------|
| フロントエンド | Next.js / TypeScript |
| バックエンド | Hasura Engine (GraphQL) |
| データベース | PostgreSQL |
| ストレージ | MinIO |
| インフラ | オンプレサーバ（Proxmox VM） + Cloudflare Tunnel |
| 開発環境 | Docker / Docker Compose |

### 選定理由

**Hasura (GraphQL)**

このアプリの主要要件は「複数ユーザーへのリアルタイム配信」でした。Hasura の GraphQL Subscription を使うことで WebSocket 通信を容易に実装できること、また GUI 上でスキーマ作成からCRUD API・Subscription クエリの生成まで行えるため、バックエンドの実装コストを大幅に削減できると判断し採用しました。

開発期間が3か月、チームのほとんどが Web 開発未経験という状況で、当日リリースを最優先にするためバックエンドに時間を割かずフロントの UI に注力できる構成を選びました。

**Next.js / TypeScript**

nutmeg（所属サークル）内の複数プロジェクトで採用されており、技術的な質問・知見の共有がしやすい環境にあったため採用しました。

**インフラ（オンプレ + Cloudflare Tunnel）**

Proxmox 上の VM にサービスを構築し、Cloudflare Tunnel 経由で外部公開しています。

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
