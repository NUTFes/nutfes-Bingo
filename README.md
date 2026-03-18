# nutfes-Bingo

技大祭当日に使うビンゴアプリです。

## セットアップ

```bash
pnpm install
cp .env.example .env
```

`.env`（必須）:

```env
NEXT_PUBLIC_SUPABASE_URL=https://nutfes-bingo.localhost/supabase
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

## Docker Compose + Caddy (HTTPS) でのローカル開発

このリポジトリの Docker 開発環境は、Caddy をリバースプロキシとして使い、
`https://nutfes-bingo.localhost` を単一オリジンにして Next.js と Supabase を配信します。

```bash
cp .env.example .env
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY を設定

mise run supabase:start
mise run docker:up
```

アプリは `https://nutfes-bingo.localhost` でアクセスします。
Supabase API は同一オリジンの `/supabase/*` にプロキシされます。

初回のみ、ブラウザで証明書警告が出る場合があります（Caddy のローカル CA）。
Linux では次の例でルート証明書を取り出して信頼ストアに登録できます。

```bash
docker compose -f compose.dev.yml exec caddy \
  cat /data/caddy/pki/authorities/local/root.crt > ./caddy-local-root.crt

sudo cp ./caddy-local-root.crt /usr/local/share/ca-certificates/caddy-local-root.crt
sudo update-ca-certificates
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
