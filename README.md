# nutfes-Bingo

技大祭当日に使うビンゴアプリです。

## セットアップ

```bash
pnpm install
cp .env.example .env
```

Docker開発だけを使う場合、`.env` のSupabase keyは `mise run dev` がローカルSupabase CLIから取得してComposeへ渡します。
ホストで `pnpm dev` などを直接実行する場合だけ、`.env` にローカルSupabaseの値を設定してください。

```env
NEXT_PUBLIC_SUPABASE_URL=https://nutfes-bingo.localhost/supabase
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## mise での環境構築・タスク実行（推奨）

このリポジトリには `mise.toml` を用意しており、`node` / `pnpm` のバージョン管理と
Supabase ローカル運用タスクをまとめて実行できます。

```bash
mise install
mise run install
mise run dev
```

`mise run dev` は次を順番に実行します。

1. `nutfes-bingo-dev` Docker networkを作成する
2. Supabase CLI local development stackをそのnetworkへ起動する
3. ローカルanon/service role keyを `supabase status -o env` から取得する
4. Caddy + Next.js dev containerを `compose.dev.yml` で起動する

アプリは `https://nutfes-bingo.localhost` でアクセスします。Supabase API は同一オリジンの `/supabase/*` にプロキシされます。

開発環境は本番self-hosted stackを使いません。`supabase start` で起動するCLI local stackだけを使います。

主な mise タスク:

```bash
mise run dev
mise run dev:down
mise run dev:network
mise run supabase:start
mise run supabase:status
mise run supabase:db-reset
mise run supabase:typegen
mise run supabase:stop
mise run prod:env:init
DEPLOY_MODE=vps mise run prod:config
DEPLOY_MODE=vps mise run prod:up
DEPLOY_MODE=vps mise run prod:ps
DEPLOY_MODE=vps mise run prod:migrate:dry-run
mise run prod:backup
```

ローカルDBもproductionと同じPostgreSQL 15へ固定しています。以前の設定でPostgreSQL 17のlocal volumeを作成済みの場合や、CLI stackのnetworkを変更したい場合は、必要なlocal dataを退避したうえで次を一度実行して作り直します。

```bash
pnpm exec supabase stop --no-backup
mise run dev
```

## Docker Compose + Caddy (HTTPS) のローカル開発

このリポジトリの Docker 開発環境は、Caddy をリバースプロキシとして使い、
`https://nutfes-bingo.localhost` を単一オリジンにして Next.js と Supabase を配信します。
Supabase CLI local stackは固定Docker network `nutfes-bingo-dev` に接続され、CaddyからKongへDocker DNSで到達します。

```bash
mise run dev
```

停止:

```bash
mise run dev:down
```

defaultで起動するSupabase local serviceはAuth、Kong、PostgREST、Storage、PostgreSQLです。コードベースで未使用のRealtime、Studio、Inbucket、Edge Runtime/Functions、Analytics、Vector、imgproxy、postgres-metaはdefault起動しません。

初回のみ、ブラウザで証明書警告が出る場合があります（Caddy のローカル CA）。
Linux では次の例でルート証明書を取り出して信頼ストアに登録できます。

```bash
docker compose -f compose.dev.yml exec caddy \
  cat /data/caddy/pki/authorities/local/root.crt > ./caddy-local-root.crt

sudo cp ./caddy-local-root.crt /usr/local/share/ca-certificates/caddy-local-root.crt
sudo update-ca-certificates
```

## VPS本番Docker + self-hosted Supabase

本番ComposeはNext.js、Caddyと、アプリが利用する最小self-hosted Supabaseをまとめて管理します。

- 残すサービス: PostgreSQL、Auth、PostgREST、Storage、Kong
- 起動しないサービス: Realtime、Edge Functions、Analytics、Studio、postgres-meta、Supavisor、imgproxy
- Storageの画像変換は無効です。景品画像のupload/removeと配信にはStorage自体を使用します。
- ブラウザへ公開するSupabase APIは`/supabase/auth/v1/*`だけです。RESTとStorageはNext.jsからDocker内部のKongへ接続します。
- Supabase Studio、Dozzle、Docker socket mountはdefault stackに含めません。管理UIやDocker socketは公開面と権限が大きいため、通常運用はSSH上のCLI、`psql`、`docker compose logs` を使います。

Supabase Docker設定は公式リポジトリのcommitを固定して取り込んでいます。更新基準は
`infra/supabase/UPSTREAM.md`を確認してください。

### VPS前提

- Linux VPS
- Docker EngineとDocker Compose
- `openssl`、`curl`
- 公開DNS名のA/AAAAレコードがVPSを指していること
- firewallでSSH、TCP 80/443、UDP 443だけを必要に応じて許可すること
- PostgreSQLやKongのportはホストへ公開しないこと

公式の全Supabase stackは4 GB RAM以上が最低要件です。この構成は未使用サービスを削っていますが、
公開テストでも2 vCPU / 4 GB RAMを推奨します。VPS上でimageをbuildする場合は追加の空きメモリが必要です。

### 初回構築

1. 本番秘密ファイルを生成します。

```bash
mise run prod:env:init
```

`.env.production`はmode 0600で生成されます。生成後、少なくとも次を実環境へ変更します。

```env
PUBLIC_DOMAIN=bingo.example.com
NEXT_PUBLIC_SITE_URL=https://bingo.example.com
NEXT_PUBLIC_SUPABASE_URL=https://bingo.example.com/supabase
SUPABASE_DB_DATA_PATH=/srv/nutfes-bingo/postgres
SUPABASE_STORAGE_DATA_PATH=/srv/nutfes-bingo/storage
```

秘密値をGitへcommitしないでください。productionではroot所有の`.env.production`または
secrets managerから配置した同等ファイルを使用します。

2. 永続ディレクトリを作成します。

```bash
sudo install -d -m 0700 /srv/nutfes-bingo/postgres
sudo install -d -m 0700 /srv/nutfes-bingo/storage
```

Dockerが書き込める所有権は、初回起動するVPS上のDocker構成に合わせて調整してください。

3. VPSの80/443で直接公開します。

```bash
DEPLOY_MODE=vps mise run prod:config
DEPLOY_MODE=vps mise run prod:up
```

Caddyが`PUBLIC_DOMAIN`の公開証明書を取得・更新し、HTTPをHTTPSへredirectします。
起動時は`supabase/migrations/`が自動適用され、成功後にNext.jsが起動します。

4. 初期データが必要な新規環境だけ、明示的にseedを適用します。

```bash
DEPLOY_MODE=vps mise run prod:seed
```

5. 状態と疎通を確認します。

```bash
DEPLOY_MODE=vps mise run prod:ps
export SUPABASE_PUBLISHABLE_KEY=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env.production)
./infra/scripts/smoke-test.sh https://bingo.example.com
```

`/api/health`はNext.js process、`/api/ready`はNext.jsからPostgREST/DBまでを確認します。
公開`/supabase/rest/v1/`が404になることもsmoke testで検証します。

### Cloudflare Tunnelを使う場合

Cloudflare Zero TrustでTunnelを作成し、Public Hostnameのserviceを`http://caddy:8080`にします。
`.env.production`へ`CLOUDFLARE_TUNNEL_TOKEN`を設定し、次で起動します。

```bash
DEPLOY_MODE=cloudflare mise run prod:up
```

このmodeではCaddyの80/443をホストへ公開せず、cloudflaredだけが内部Caddyへ接続します。

### Migration・typegen

- schema変更は必ず`supabase/migrations/`へ追加します。
- production DBをStudioや`psql`から直接変更しません。
- Compose起動時の`migrate` serviceが`supabase db push --db-url`を実行します。
- 適用前に確認する場合は次を実行します。

```bash
DEPLOY_MODE=vps mise run prod:migrate:dry-run
```

local schemaから型を再生成します。

```bash
mise run supabase:db-reset
mise run supabase:typegen
git diff -- src/types/database.types.ts
```

### Backup・restore

DB dump、global roles、Storage実体を同じtimestamp directoryへ保存します。

```bash
mise run prod:backup
# または保存先を指定
./infra/scripts/backup.sh /mnt/backup/nutfes-bingo
```

backup directoryはVPSとは別の暗号化された保存先へ転送してください。DB backupだけではStorageの画像実体は復元できません。

restoreは破壊的操作なので明示確認が必要です。対象backupと同じSupabase/PostgreSQL versionで、先に検証環境へrestoreしてください。

```bash
CONFIRM_RESTORE=restore-nutfes-bingo \
  ./infra/scripts/restore.sh /mnt/backup/nutfes-bingo/20260609T120000Z
```

rollbackは「アプリ/image tagを直前の値へ戻す」だけではDB変更を戻せません。更新前backupを取得し、必要なら次の順で戻します。

1. `APP_IMAGE_TAG` とCompose/Supabase image tagを直前のcommitの値へ戻す
2. 対象backupを検証環境でrestoreして内容を確認する
3. 本番で `CONFIRM_RESTORE=restore-nutfes-bingo ./infra/scripts/restore.sh <backup>` を実行する
4. `DEPLOY_MODE=vps mise run prod:up` とsmoke testで復旧を確認する

### 更新と停止

更新前に必ずbackupを取得し、`infra/supabase/UPSTREAM.md`のupstream差分を確認します。

```bash
mise run prod:backup
DEPLOY_MODE=vps mise run prod:config
DEPLOY_MODE=vps mise run prod:up
DEPLOY_MODE=vps mise run prod:logs
DEPLOY_MODE=vps mise run prod:down
```

`docker compose down -v`、DB/Storage pathの削除、restoreはデータ消失を伴うため通常運用では実行しません。
Docker imageは`latest`を使わず、Compose内の固定tagまたはupstream commitに対応するtagへ明示更新します。

## Admin 認証の運用方針

- メールサーバーは使用しないため、確認メール経由の運用やパスワードリセット/更新機能は提供しません。
- 管理者権限への昇格は Supabase 側（`profiles.role = 'admin'`）で手動付与します。
- 本番ではGoTrueとアプリ画面の両方でサインアップを無効にします。事前セットアップ時だけ
  `DISABLE_SIGNUP=false`と`NEXT_PUBLIC_ENABLE_ADMIN_SIGNUP=1`を設定して`auth`と`app`を再作成し、
  アカウント作成後は`true`と`0`へ戻してください。
- 管理者権限は`docker compose exec db psql -U postgres`など、外部公開されないDB接続から
  `profiles.role = 'admin'`を手動設定します。

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
