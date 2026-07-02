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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
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
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY と SUPABASE_SECRET_KEY を設定

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

## 本番相当セルフホスト構成（Cloudflared / staging）

staging は `https://bingo-stg.nutfes.net` を公開 URL とし、Cloudflare Tunnel の
ダッシュボード設定で origin を `app:3000` に向けます。Compose 内では次の構成です。

- `cloudflared`: Cloudflare Tunnel。`app:3000` へ到達できる同一 Compose network に参加します。
- `app`: Caddy ingress。`:3000` で待ち受け、`/supabase/*` を Supabase Kong へ、それ以外を Next.js へ転送します。
- `web`: Next.js standalone runtime。`Dockerfile` の build args で `NEXT_PUBLIC_*` を build 時に固定します。
- Supabase: この repo の `supabase/self-host/` で同期・起動する公式 self-host Docker stack。既定では `supabase_network_nutfes-Bingo` 上の `supabase_kong_nutfes-Bingo:8000` を参照します。

### 0. Supabase self-hosted stack の準備

公式 Supabase Docker 構成を pin した ref から `supabase/self-host/upstream/` に同期し、
staging 用 URL とランダム secret を含む ignored env を生成します。

```bash
mise run supabase:selfhost:sync
mise run supabase:selfhost:init-env
mise run prod:init-env
mise run supabase:selfhost:config
mise run supabase:selfhost:up
mise run supabase:selfhost:health
mise run supabase:selfhost:db-apply
```

`supabase/self-host/.env.local` と `.env.production.local` は commit しません。
`prod:init-env` は self-host 側の生成値から、アプリ側の `.env.production.local`
へ次の対応で値を設定します。

```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase/self-host/.env.local の SUPABASE_PUBLISHABLE_KEY>
SUPABASE_SECRET_KEY=<supabase/self-host/.env.local の SUPABASE_SECRET_KEY>
SUPABASE_SERVER_URL=http://supabase_kong_nutfes-Bingo:8000
SUPABASE_UPSTREAM=supabase_kong_nutfes-Bingo:8000
SUPABASE_DOCKER_NETWORK=supabase_network_nutfes-Bingo
```

Supabase stack の停止・確認:

```bash
mise run supabase:selfhost:ps
mise run supabase:selfhost:health
mise run supabase:selfhost:db-apply
mise run supabase:selfhost:logs
mise run supabase:selfhost:down
```

### 1. 環境ファイル

```bash
cp .env.production.example .env.production.local
```

`.env.production.local` の主な値:

```env
NEXT_PUBLIC_SUPABASE_URL=https://bingo-stg.nutfes.net/supabase
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVER_URL=http://supabase_kong_nutfes-Bingo:8000
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_UPSTREAM=supabase_kong_nutfes-Bingo:8000
SUPABASE_DOCKER_NETWORK=supabase_network_nutfes-Bingo
ENABLE_ADMIN_SIGNUP=0
```

Cloudflared の tunnel token は `.env.production.local` に書かず、起動時の shell
環境変数としてだけ渡します。このリポジトリの `compose.prod.yml` は Docker Compose の
environment-backed secrets を使うため、token は `docker compose config` の通常出力や
コンテナ環境変数に展開されません。

```bash
export CLOUDFLARED_TUNNEL_TOKEN='<Cloudflare dashboard の tunnel token>'
```

environment-backed secrets を扱える Docker Compose を使ってください。token ファイルを
このリポジトリ配下へ置かないでください。

### 2. Supabase self-hosted stack 側の URL 設定

Supabase stack 側も、public URL / Auth URL が staging の同一オリジンになるよう設定します。
Supabase の公式 self-host reverse proxy ガイドでは、HTTPS 配下で `SUPABASE_PUBLIC_URL`、
`API_EXTERNAL_URL`、`SITE_URL` を外部 URL に合わせること、Realtime 用に WebSocket を通すこと、
`X-Forwarded` 系ヘッダーを渡すことが求められます。

`mise run supabase:selfhost:init-env` は、次の値を `supabase/self-host/.env.local`
へ生成します。このリポジトリの Caddy は `/supabase/*` を Kong に転送するため、
手動で編集する場合も同じ値に揃えてください。

```env
SUPABASE_PUBLIC_URL=https://bingo-stg.nutfes.net/supabase
API_EXTERNAL_URL=https://bingo-stg.nutfes.net/supabase
SITE_URL=https://bingo-stg.nutfes.net
```

Auth redirect allow-list には、必要に応じて次を追加します。

```text
https://bingo-stg.nutfes.net/**
https://bingo-stg.nutfes.net/auth/confirm
```

### 3. 事前検証

```bash
mise run prod:config
mise run prod:caddy-validate
mise run prod:build
```

`prod:config` は real secret を表示しないよう `docker compose config --quiet` で検証のみ行います。
設定内容を展開表示したい場合は、必ず dummy の env ファイルで実行してください。

### 4. 起動・確認

Supabase self-hosted stack が起動し、`SUPABASE_DOCKER_NETWORK` の external network が
存在する状態で実行します。

```bash
mise run prod:up
curl -I https://bingo-stg.nutfes.net/
curl -I https://bingo-stg.nutfes.net/supabase/auth/v1/health
mise run prod:logs
```

停止・ロールバック:

```bash
mise run prod:down
```

## Admin 認証の運用方針

- メールサーバーは使用しないため、確認メール経由の運用やパスワードリセット/更新機能は提供しません。
- 管理者権限への昇格は Supabase 側（`profiles.role = 'admin'`）で手動付与します。

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
