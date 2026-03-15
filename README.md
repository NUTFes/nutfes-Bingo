# nutfes-Bingo

技大祭当日に使うビンゴアプリです。

## セットアップ

```bash
pnpm install
cp .env.example .env
```

`.env`（必須）:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

## mise での環境構築・タスク実行（推奨）

このリポジトリには `mise.toml` を用意しており、`node` / `pnpm` のバージョン管理と
Supabase ローカル運用タスクをまとめて実行できます。

```bash
mise install
mise run install
mise run dev
```

Supabase タスク:

```bash
mise run supabase:start
mise run supabase:status
mise run supabase:db-reset
mise run supabase:typegen
mise run supabase:stop
```

## pnpm コマンド

```bash
pnpm dev
pnpm lint
pnpm build
pnpm start
```

## Branch 命名規則

新機能の Branch 名：feature/issue○○/title[isuue の簡単な説明]

修正の Branch 名：fix/issue○○/title[issue の簡単な説明]

## PR 命名規則

新機能：[add] title

編集・修正：[fix] title

削除：[del] title
