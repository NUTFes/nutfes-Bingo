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

## 本番 Docker + Cloudflare Tunnel

本番は self-hosted Supabase も Docker 内で運用し、Cloudflare Tunnel だけを外部公開口にします。
ホストの 80/443 は `compose.prod.yml` では公開しません。

通信経路:

```text
Internet -> Cloudflare -> cloudflared -> caddy:8080
                                      ├─ /supabase/* -> Supabase Kong
                                      └─ /*           -> Next.js app
```

Caddy は本番では TLS 終端をしません。Cloudflare が外部 TLS を終端し、Caddy は Docker
内部で Next.js と Supabase Kong を同一オリジンに束ねるリバースプロキシとして使います。

1. self-hosted Supabase の本番 stack を先に起動し、Kong の service 名と Docker network 名を確認します。
   例では `SUPABASE_DOCKER_NETWORK=supabase_default`、`SUPABASE_KONG_HOST=kong` を想定します。

2. Cloudflare Zero Trust で Tunnel を作成し、Public Hostname の service を次に設定します。

```text
http://caddy:8080
```

3. 本番環境変数を作成します。

```bash
cp .env.production.example .env.production
```

主な値:

```env
NEXT_PUBLIC_SITE_URL=https://bingo.example.com
NEXT_PUBLIC_SUPABASE_URL=https://bingo.example.com/supabase
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVER_URL=http://caddy:8080/supabase
SUPABASE_DOCKER_NETWORK=supabase_default
SUPABASE_KONG_HOST=kong
CLOUDFLARE_TUNNEL_TOKEN=...
```

`NEXT_PUBLIC_SUPABASE_URL` はブラウザ用の公開URLです。`SUPABASE_SERVER_URL` は
Next.js コンテナから使う内部URLです。本番では Cloudflare を往復しないよう、
`http://caddy:8080/supabase` を使います。

4. 起動します。

```bash
docker compose -f compose.prod.yml --env-file .env.production up -d --build
```

5. 確認します。

```bash
docker compose -f compose.prod.yml --env-file .env.production ps
curl -I https://bingo.example.com/api/health
curl -I https://bingo.example.com/supabase/rest/v1/
```

`/api/health` が HTTP 200 を返し、`/supabase/rest/v1/` が Supabase Kong から応答すれば、
Cloudflare Tunnel、Caddy、Next.js、Supabase Kong の経路は成立しています。

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
