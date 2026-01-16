# Supabase 開発ガイド

このドキュメントでは、Bingo プロジェクトでの Supabase の使い方を説明します。

## 🚀 クイックスタート

### 初回セットアップ

```bash
# プロジェクトルートで実行
make setup
```

### 日常的な起動/停止

```bash
# Supabase を起動
make supa-up

# Supabase を停止
make supa-down

# Supabase を再起動
make supa-restart
```

## 📊 データベース操作

### DB の状態確認

```bash
# テーブル一覧とレコード数を確認
make db-status
```

### SQL クエリを実行

```bash
# 簡単なクエリを実行
make db-query SQL="SELECT * FROM public.numbers LIMIT 5"

# テーブル一覧を確認
make db-tables

# テーブルの詳細（カラム情報）を確認
make db-schema TABLE=numbers
```

### PostgreSQL シェル（インタラクティブ）

```bash
# psql を直接操作したい場合
make db-shell

# シェル内で使える便利なコマンド:
#   \dt public.*     -- テーブル一覧
#   \d tablename     -- テーブル詳細
#   \q               -- 終了
```

## 🔄 リセット

### DB を完全にリセット（データ全削除）

```bash
make supa-reset
```

⚠️ このコマンドはすべてのデータを削除します。開発環境でのみ使用してください。

## 📁 ファイル構成

```
supabase-project/
├── docker-compose.yml     # Supabase のメイン設定
├── .env                   # 環境変数
├── scripts/               # ヘルパースクリプト
│   ├── db-setup.sh        # ストレージバケット設定
│   ├── db-reset.sh        # DB リセット
│   ├── db-query.sh        # SQL 実行ヘルパー
│   └── db-status.sh       # DB 状態確認
└── volumes/
    └── db/
        ├── schema.sql     # テーブル定義（初回起動時に実行）
        ├── seed.sql       # 初期データ（初回起動時に実行）
        └── data/          # PostgreSQL データ（自動生成）
```

## 🗃️ テーブル構成

| テーブル名       | 説明                                |
| ---------------- | ----------------------------------- |
| `numbers`        | ビンゴの番号（1-75）                |
| `images`         | アップロードされた画像のメタデータ  |
| `prizes`         | 景品情報                            |
| `events`         | イベント設定（アンケート URL など） |
| `reach_logs`     | リーチ数のログ                      |
| `stamp_triggers` | スタンプトリガー                    |

## 🌐 アクセス先

| サービス        | URL                   | 説明                    |
| --------------- | --------------------- | ----------------------- |
| Supabase Studio | http://localhost:3000 | GUI でテーブルを操作    |
| Kong API        | http://localhost:8000 | REST API エンドポイント |
| PostgreSQL      | localhost:5432        | 直接接続（開発用）      |

## 📝 よくある操作

### 新しいテーブルを追加する

1. `volumes/db/schema.sql` にテーブル定義を追加
2. `make supa-reset` で DB をリセット

### 初期データを変更する

1. `volumes/db/seed.sql` を編集
2. `make supa-reset` で DB をリセット

### SQL ファイルを直接実行する

```bash
# scripts/db-query.sh を使用
./supabase-project/scripts/db-query.sh -f path/to/your-file.sql
```

## 🔧 トラブルシューティング

### DB が起動しない

```bash
# ログを確認
make logs-db

# 完全リセット
make supa-reset
```

### ストレージにアップロードできない

```bash
# ストレージのログを確認
make logs-storage

# バケットが存在するか確認
make db-query SQL="SELECT * FROM storage.buckets"
```

### コンテナの状態を確認

```bash
docker ps --filter "name=supabase"
```
