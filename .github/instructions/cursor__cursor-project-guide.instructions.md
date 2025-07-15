---
description: ""
applyTo: "**"
---

# Project Development Guide

## プロジェクト概要

- **プロジェクト名**: Nutfes-Bingo
- **アーキテクチャ**: Docker Compose (api/view-user/view-admin/db/minio)
- **バックエンド**: Hasura + PostgreSQL
- **フロントエンド**: Next.js + Apollo Client + Recoil
- **認証**: NextAuth + Keycloak
- **ストレージ**: MinIO

## 🛠️ 開発環境・コマンド

### 環境構築

```bash
make run          # 開発環境起動 (Docker Compose + DB適用)
make down         # 環境停止
make run-prod     # 本番環境起動
```

### ビルド・テスト・開発

```bash
# view-user / view-admin 共通
npm run dev       # 開発サーバー起動
npm run build     # 本番ビルド
npm run lint      # ESLint実行
npm run lint:fix  # ESLint自動修正
npm run codegen   # GraphQL型生成

# Makefile経由
make codegen      # 両アプリの型生成
make db-apply     # Hasura メタデータ・マイグレーション適用
```

## 📝 コードスタイル・規約

### 技術スタック

- **言語**: TypeScript + Next.js
- **フォーマット**: Prettier + ESLint (next/core-web-vitals, prettier, import/warnings)
- **スタイル**: CSS Modules (`*.module.css`)

### 命名規則

- **React Component**: PascalCase
- **GraphQL フィールド**: camelCase
- **ファイル名**: kebab-case または PascalCase (コンポーネント)

### Import ルール

- **エイリアス**: `@/*` を使用
- **共通コンポーネント**: `@/components/common` から import
- **順序**: 外部ライブラリ → 内部ライブラリ → 相対パス

### エラーハンドリング

- **基本**: `try-catch` パターン
- **フォーム**: `react-hook-form` バリデーション
- **GraphQL**: Apollo Client エラーハンドリング
  description:
  globs:
  alwaysApply: false

---