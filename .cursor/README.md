# Cursor Rules Management - 分散型

## 📋 概要

このディレクトリは Nutfes-Bingo プロジェクトの開発ルールを**分散管理**するための rulesync システムです。

## 📁 ファイル構成

```
.cursor/
├── rules/
│   ├── project-guide.mdc          # 📘 プロジェクト概要・環境・コードスタイル
│   ├── commit-message-rules.mdc   # 📝 Gitコミット・ブランチルール
│   └── pull-request-rules.mdc     # 🔄 PR作成・GitHub MCPルール
├── rulesync.json                  # ⚙️ 分散ルール管理設定
└── README.md                      # 📖 このファイル（管理方法の説明）
```

## 🎯 分散ルールファイル

### 📘 `project-guide.mdc`

- **プロジェクト概要**: アーキテクチャ・技術スタック
- **開発環境・コマンド**: 環境構築・ビルド・テスト手順
- **コードスタイル・規約**: TypeScript・命名規則・import ルール

### 📝 `commit-message-rules.mdc`

- **コミットルール**: フォーマット・タイプ一覧・良い例/悪い例
- **ブランチ戦略**: feature/fix ブランチの命名規則

### 🔄 `pull-request-rules.mdc`

- **PR 作成手順**: GitHub MCP 使用法・テンプレート準拠
- **チェックリスト**: 必須事項・推奨事項

## 🔄 rulesync とは？

**rulesync**は、分散したルールファイルを各 AI 開発ツール（Cursor、Claude、Cline）で**統一的に参照**するための仕組みです。

### 機能

- **分散管理**: 目的別にルールを分割して管理
- **スコープ設定**: ファイルタイプごとに適用ルールを制御
- **統一参照**: Cursor/Claude/Cline で同じルールセットを参照
- **自動同期**: ルール変更の自動反映・競合解決

### メリット

- **保守性**: 関連するルールをまとめて編集
- **可読性**: 目的別に分かれているため理解しやすい
- **拡張性**: 新しいルール種別を追加しやすい
- **一貫性**: 全 AI ツールで同じルールを適用

## 🔄 ルール更新手順

### 1. 個別ルール変更時

```bash
# 該当ルールファイルを編集
code .cursor/rules/project-guide.mdc        # プロジェクト設定変更時
code .cursor/rules/commit-message-rules.mdc # コミットルール変更時
code .cursor/rules/pull-request-rules.mdc   # PRルール変更時

# 変更をコミット（対象ルールに応じて）
git add .cursor/rules/
git commit -m "docs: update [対象] development rules"
git push
```

### 2. チーム同期

- **新メンバー**: リポジトリクローン時に自動的に最新ルールが適用
- **既存メンバー**: `git pull` で最新ルールを取得
- **Cursor**: `.cursor/rules/` ディレクトリを自動認識・適用

### 3. ルール追加時

新しい種別のルールを追加する場合：

1. **ルールファイル作成**: `.cursor/rules/new-rule.mdc`
2. **rulesync.json 更新**: `rules_files` 配列に追加
3. **コミット・プッシュ**: チーム全体に共有

## 🎯 ベストプラクティス

### ルール編集時

- **目的明確化**: 1 ファイル = 1 つの関心事
- **具体例追加**: 良い例・悪い例を必ず含める
- **簡潔性**: 1 ルールあたり 1 ～ 2 行で記述

### チーム運用

- **定期見直し**: 月 1 回程度でルールの妥当性を確認
- **段階的導入**: 新ルールは段階的に導入・定着
- **フィードバック収集**: チームメンバーからの改善提案を歓迎

---

**rulesync システム v1.0** - 分散型開発ルール管理
