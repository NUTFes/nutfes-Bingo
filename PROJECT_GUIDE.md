# Nutfes-Bingo 開発ガイド

## 🚀 クイックスタート

```bash
make run          # 開発環境起動 (Docker Compose + DB適用)
make down         # 環境停止
make codegen      # GraphQL型生成
make db-apply     # Hasura メタデータ・マイグレーション適用
```

## 🛠️ ビルド・テスト

```bash
# view-user / view-admin 共通
npm run dev       # 開発サーバー起動
npm run build     # 本番ビルド
npm run lint      # ESLint実行
npm run lint:fix  # ESLint自動修正
```

## 📝 コードスタイル

- **言語**: TypeScript + Next.js
- **フォーマット**: Prettier + ESLint
- **スタイル**: CSS Modules (`*.module.css`)
- **Import**: `@/*` エイリアス使用、外部 → 内部 → 相対パスの順
- **命名**: React Component は PascalCase、ファイルは kebab-case

## 🏗️ アーキテクチャ

- **構成**: Docker Compose (api/view-user/view-admin/db/minio)
- **バックエンド**: Hasura + PostgreSQL + MinIO
- **フロントエンド**: Next.js + Apollo Client + Recoil + NextAuth

## 📋 開発フロー

1. 機能ブランチ作成 → 開発 → コミット（[commit-message-rules.mdc](/.cursor/rules/commit-message-rules.mdc) 準拠）
2. プルリクエスト作成（[pull-request-rules.mdc](/.cursor/rules/pull-request-rules.mdc) 準拠）
3. レビュー → マージ

詳細は [.cursor/rules/project-guide.mdc](/.cursor/rules/project-guide.mdc) を参照
