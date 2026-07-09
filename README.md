# nutfes-Bingo

技大祭当日に使うビンゴアプリです。

## 開発環境クイックスタート

### 前提

- Docker Engine / Docker Compose が起動していること
- `mise` が使えること
- Node と pnpm は `mise.toml` の `node = "26.2.0"` / `pnpm = "11.2.2"` に固定します
- アプリの起動とproduction buildはDocker内で行います。ホストで `pnpm dev` / `pnpm build` は実行しません

### 初回セットアップ

```bash
mise trust
mise install
mise run install
cp .env.example .env
mise run up
```

`mise run up` は次を順番に実行します。

1. `nutfes-bingo-dev` Docker networkを作成する
2. Supabase CLI local development stackをそのnetworkへ起動する
3. ローカルanon/service role keyを `supabase status -o env` から取得する
4. Next.js dev containerを `compose.dev.yml` でbuildして起動する

`.env` のSupabase keyは通常編集しません。Docker開発では `mise run up` がローカルSupabase CLIから取得した値をComposeへ渡します。ローカルで上書きしたい値がある場合だけ `.env` に設定してください。

### 起動後に見る場所

- User home: `http://localhost:3000`
- User screen: `http://localhost:3000/screen`
- Prize list: `http://localhost:3000/prizes`
- Admin login: `http://localhost:3000/admin/login`
- Admin dashboard: `http://localhost:3000/admin`
- Health check: `http://localhost:3000/api/health`
- Readiness check: `http://localhost:3000/api/ready`

Adminアカウントはself-service signupでは作成しません。開発環境ではローカルSupabase起動後にCLIで作成します。

```bash
# 12文字以上のパスワードを入力して保存します
nano /tmp/nutfes-local-admin-password
chmod 0600 /tmp/nutfes-local-admin-password

ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD_FILE=/tmp/nutfes-local-admin-password \
  mise run admin:bootstrap

mise run admin:list
mise run admin:verify
rm -f /tmp/nutfes-local-admin-password
```

### 日常操作

```bash
mise run up        # 開発stackを起動
mise run ps        # app containerとSupabase local statusを確認
mise run logs      # app container logを追う
mise run shell     # app containerへ入る
mise run sync      # package変更後、起動中container内の依存関係を同期
mise run down      # app containerとSupabase local stackを停止
```

品質チェック:

```bash
mise run check     # pnpm fmt:check + pnpm lint + pnpm typecheck
pnpm doctor        # React / Next.js変更時
pnpm knip          # 依存関係、exports、entry point、削除変更時
```

production buildの確認は、開発container起動中に実行します。

```bash
mise run build
```

このリポジトリには自動テストスイートがありません。動作確認は該当画面/APIの手動確認、`/api/health`、`/api/ready`、上記の静的チェックで行います。

### ローカルSupabase・DB・型生成

開発環境は本番self-hosted stackを使いません。`supabase start` で起動するCLI local stackだけを使います。ブラウザはSupabase APIを直接呼ばず、すべてNext.jsの画面、Server Action、`/api/*` routeを経由します。Docker内のNext.js server-side処理は、同じDocker network上のKong `http://supabase_kong_nutfes-Bingo:8000` へ接続します。

defaultで起動するSupabase local serviceはAuth、Kong、PostgREST、Storage、PostgreSQLです。コードベースで未使用のRealtime、Mailpit、Edge Runtime、Logflare、Vector、imgproxy、Supavisorはdefault起動しません。Studioとpostgres-metaも通常起動しません。

```bash
mise run db-status
mise run db-reset
mise run typegen
mise run db-down
```

StudioでAuth user、DB、Storageを確認したい場合だけ、opt-inで起動します。`mise run db-status` にStudio URLが表示されます。

```bash
mise run up:studio
mise run db-status
```

ローカルDBもproductionと同じPostgreSQL 17へ固定しています。以前の設定で別major versionのlocal volumeを作成済みの場合や、CLI stackのnetworkを変更したい場合は、必要なlocal dataを退避したうえで次を一度実行して作り直します。

```bash
pnpm exec supabase stop --no-backup
mise run up
```

### 本番運用タスクの入口

```bash
mise run prod:env:init
mise run prod:preflight
mise run prod:config
mise run prod:deploy
mise run prod:smoke
mise run prod:ps
mise run prod:migrate:dry-run
mise run prod:backup
mise run prod:admin:bootstrap
mise run prod:admin:reset-password
mise run prod:admin:list
mise run prod:admin:verify
```

## Proxmox LXC + Cloudflared 本番Docker + self-hosted Supabase

本番公開経路はProxmox上のLXC + Cloudflare Tunnelに固定します。VPSで80/443を直接公開する構成はこのリポジトリでは扱いません。

本番ComposeはNext.js、Cloudflaredと、アプリが利用する最小self-hosted Supabaseをまとめて管理します。

- 残すサービス: PostgreSQL、Auth、PostgREST、Storage、Kong
- 起動しないサービス: Realtime、Edge Functions、Analytics、Studio、postgres-meta、Supavisor、imgproxy
- Storageの画像変換は無効です。景品画像のupload/removeと配信にはStorage自体を使用します。
- 公開するHTTP originはNext.jsだけです。ブラウザからSupabase Auth、PostgREST、Storage、S3互換APIを直接叩きません。
- Next.js server-side処理だけがDocker内部の `http://kong:8000` へ接続します。
- Supabase Studio、Dozzle、Docker socket mountはdefault stackに含めません。管理UIやDocker socketは公開面と権限が大きいため、通常運用はSSH上のCLI、`psql`、`docker compose logs` を使います。
- CloudflaredだけがCompose network上の `app:3000` へ接続します。Kong、PostgreSQL、StorageはCloudflaredの公開先にしません。LXCホストでアプリ用の80/443を公開しません。

Supabase Docker設定は公式リポジトリのcommitを固定して取り込んでいます。更新基準は
`infra/supabase/UPSTREAM.md`を確認してください。

この判断は `docs/adr/ADR-0001-proxmox-lxc-cloudflared-production.md`、`docs/adr/ADR-0002-cloudflared-direct-app-supabase-hostnames.md`、`docs/adr/ADR-0004-nextjs-only-public-boundary.md` に記録しています。

### LXC前提

- Proxmox上のLinux LXC
- Docker EngineとDocker Compose
- `openssl`、`curl`
- Cloudflare Zero TrustのTunnelとPublic Hostnameを作成できること
- Public Hostnameを1つ作成し、serviceを `http://app:3000` にすること
  - `<NEXT_PUBLIC_SITE_URL host> -> http://app:3000` だけを設定します
  - `/auth/v1`、`/rest/v1`、`/storage/v1` 用のPublic Hostnameは作成しません
  - Cloudflare API tokenを用意できる場合は `mise run prod:cloudflare:check` で検証します
- firewallでは原則SSHなどの管理口だけを許可し、アプリ公開用にTCP 80/443やUDP 443を開けないこと
- PostgreSQL、Kong、Next.jsのportをLXCホストへ公開しないこと

公式の全Supabase stackは4 GB RAM以上が最低要件です。この構成は未使用サービスを削っていますが、
公開テストでも2 vCPU / 4 GB RAMを推奨します。LXC上でimageをbuildする場合は追加の空きメモリが必要です。

### 初回構築

1. Cloudflare Zero TrustでTunnelを作成し、Public Hostnameを1つ設定します。
   - `app.example.com` -> `http://app:3000`

2. 本番秘密ファイルを生成します。

```bash
mise run prod:env:init
```

`.env.production`はmode 0600で生成されます。生成後、少なくとも次を実環境へ変更します。

```env
NEXT_PUBLIC_SITE_URL=https://app.example.com
SITE_URL=https://app.example.com
SUPABASE_SERVER_URL=http://kong:8000
SUPABASE_PUBLIC_URL=http://kong:8000
API_EXTERNAL_URL=http://kong:8000/auth/v1
ADDITIONAL_REDIRECT_URLS=https://app.example.com/**
CLOUDFLARE_TUNNEL_TOKEN=replace-with-cloudflare-tunnel-token
SUPABASE_DB_DATA_PATH=/srv/nutfes-bingo/postgres
SUPABASE_STORAGE_DATA_PATH=/srv/nutfes-bingo/storage
```

秘密値をGitへcommitしないでください。productionではroot所有の`.env.production`または
secrets managerから配置した同等ファイルを使用します。

3. 永続ディレクトリを作成します。

```bash
sudo install -d -m 0700 /srv/nutfes-bingo/postgres
sudo install -d -m 0700 /srv/nutfes-bingo/storage
```

Dockerが書き込める所有権は、初回起動するLXC上のDocker構成に合わせて調整してください。

4. 本番前検査を実行します。

```bash
mise run prod:preflight
```

`prod:preflight` は、LXC、必須コマンド、`.env.production`の権限、Cloudflared token、永続ディレクトリ、Compose設定を検査します。

LXC上に `mise` がない場合は、同じ検査を直接実行できます。

```bash
./infra/scripts/annual-ops.sh preflight
```

5. 起動します。

```bash
mise run prod:config
mise run prod:deploy
```

`prod:deploy` は preflight、Compose起動、smoke testを順番に実行します。

LXC上に `mise` がない場合の同等コマンド:

```bash
./infra/scripts/compose.sh config --quiet
./infra/scripts/annual-ops.sh deploy
```

起動時は`supabase/migrations/`が自動適用され、成功後にNext.jsが起動します。

本番appはLXC上でbuildせず、`APP_IMAGE=ghcr.io/nutfes/nutfes-bingo@sha256:<digest>` をpullします。release registry credentialsがない環境では、review済みcommitから次を実行してdigestを取得し、`.env.production` の `APP_IMAGE` へ反映します。

```bash
docker buildx build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://app.example.com \
  --tag ghcr.io/nutfes/nutfes-bingo:<git-sha> \
  --push .
docker buildx imagetools inspect ghcr.io/nutfes/nutfes-bingo:<git-sha>
```

通常の `prod:deploy` はlocal buildを行いません。緊急時にLXCでlocal buildする場合だけ、`mise run prod:backup` 後に明示的にoverrideを足します。

```bash
docker compose --env-file .env.production -f compose.prod.yml -f compose.prod.build.yml up -d --wait --remove-orphans
```

Production base/service image digestは、次の形式で解決して記録します。

```bash
docker buildx imagetools inspect node:26.2.0-alpine
docker buildx imagetools inspect supabase/gotrue:v2.189.0
docker buildx imagetools inspect postgrest/postgrest:v14.12
docker buildx imagetools inspect supabase/storage-api:v1.60.4
docker buildx imagetools inspect kong/kong:3.9.1
docker buildx imagetools inspect supabase/postgres:17.6.1.136
docker buildx imagetools inspect cloudflare/cloudflared:2026.6.1
```

6. 初期データが必要な新規環境だけ、明示的にseedを適用します。

```bash
mise run prod:seed
```

7. 状態と疎通を確認します。

```bash
mise run prod:ps
mise run prod:smoke
```

LXC上に `mise` がない場合の同等コマンド:

```bash
./infra/scripts/compose.sh ps
./infra/scripts/annual-ops.sh smoke
```

`/api/health`はNext.js process、`/api/ready`はNext.jsからPostgREST/DBまでを確認します。
smoke testは `NEXT_PUBLIC_SITE_URL` の `/api/health`、`/api/ready`、`/api/bingo/state`、`/api/bingo/prizes`、`/api/bingo/screen` を確認します。Supabase疎通はNext.jsの `/api/ready` とBFF API経由で確認します。

### Security model

This project uses a BFF-only Supabase model: browser code must not create Supabase clients or call Auth/PostgREST/Storage directly; authorization happens in Next.js Server Actions and API routes; the service-role/secret key is a total-compromise secret.

Public, anon, and authenticated Data API grants are intentionally revoked. RLS remains defense-in-depth, not the primary app authorization layer.

### Migration・typegen

- schema変更は必ず`supabase/migrations/`へ追加します。
- production DBをStudioや`psql`から直接変更しません。
- Compose起動時の`migrate` serviceが`supabase db push --db-url`を実行します。
- 適用前に確認する場合は次を実行します。

```bash
mise run prod:migrate:dry-run
```

local schemaから型を再生成します。

```bash
mise run db-reset
mise run typegen
git diff -- src/types/database.types.ts
```

CIはSupabase変更時にlocal DB reset、型生成、`src/types/database.types.ts` のdiff確認を実行し、生成型のfreshnessを強制します。

### Backup・restore

DB dump、global roles、Storage実体を同じtimestamp directoryへ保存します。

```bash
mise run prod:backup
# または保存先を指定
./infra/scripts/backup.sh /mnt/backup/nutfes-bingo
```

backup directoryはLXCとは別の暗号化された保存先へ転送してください。DB backupだけではStorageの画像実体は復元できません。

Offsite backupは `rclone copy` だけを使います。systemd timerまたはcronでは、`REMOTE_BACKUP_TARGET` を含むmode 0600の環境ファイルを読み込み、次を実行します。

```bash
REMOTE_BACKUP_TARGET=remote:nutfes-bingo-backups mise run prod:backup:offsite
```

例: `/etc/systemd/system/nutfes-bingo-backup.service` は `EnvironmentFile=/etc/nutfes-bingo-backup.env` とし、`ExecStart=/usr/bin/env mise run prod:backup:offsite` を設定します。cronの場合も同じ環境ファイルをsourceしてから同じcommandを実行します。

各backupには `deployment-manifest.json` と `SHA256SUMS` が含まれます。manifestは非secretのcommit、Compose/Supabase設定hash、image参照、migration一覧を記録します。

restoreは破壊的操作なので明示確認が必要です。対象backupと同じSupabase/PostgreSQL versionで、先に検証環境へrestoreしてください。

```bash
CONFIRM_RESTORE=restore-nutfes-bingo \
  ./infra/scripts/restore.sh /mnt/backup/nutfes-bingo/20260609T120000Z
```

Restore検証はproduction credentialsを使わず、同じimage digestと `.env.production` 互換設定を持つstaging LXCで実行します。手順は、backupをstagingへ配置し、`CONFIRM_RESTORE=restore-nutfes-bingo ./infra/scripts/restore.sh <backup-dir>` を実行し、最後に `mise run prod:smoke` で確認します。

rollbackは「アプリ/image digestを直前の値へ戻す」だけではDB変更を戻せません。更新前backupを取得し、必要なら次の順で戻します。

1. `APP_IMAGE` とCompose/Supabase image digestを直前のcommitの値へ戻す
2. 対象backupを検証環境でrestoreして内容を確認する
3. 本番で `CONFIRM_RESTORE=restore-nutfes-bingo ./infra/scripts/restore.sh <backup>` を実行する
4. `mise run prod:deploy` とsmoke testで復旧を確認する

### 更新と停止

更新前に必ずbackupを取得し、`infra/supabase/UPSTREAM.md`のupstream差分を確認します。

```bash
mise run prod:backup
mise run prod:config
mise run prod:deploy
mise run prod:logs
mise run prod:down
```

`docker compose down -v`、DB/Storage pathの削除、restoreはデータ消失を伴うため通常運用では実行しません。
Docker imageは`latest`を使わず、Compose内の固定tag+digestまたはCIで作成したapp image digestへ明示更新します。

## Admin 認証の運用方針

- メールサーバーは使用しないため、確認メール経由の運用やパスワードリセット/更新機能は提供しません。
- self-service signupは開発・本番とも提供しません。Admin作成はCLIだけに限定し、本番Supabase Authは `DISABLE_SIGNUP=true` を維持します。
- 初期AdminはSupabase Auth Admin APIでAuth userを作成し、PostgREST公開対象外の `private.bootstrap_initial_admin` database functionで `profiles.role = 'admin'` にします。
- `auth.users` へSQLで直接insertしません。Supabase Studioも本番の通常運用では起動しません。

この判断は `docs/adr/ADR-0003-admin-bootstrap-with-auth-admin-api.md` に記録しています。

初期Admin作成は、`prod:deploy` が成功したあとにLXC上で実行します。パスワードはファイルから渡すか、未指定なら対話入力します。ファイルを使う場合はmode 0600にしてください。

```bash
# 12文字以上のパスワードを入力して保存します
nano /tmp/nutfes-admin-password
chmod 0600 /tmp/nutfes-admin-password

ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD_FILE=/tmp/nutfes-admin-password \
CONFIRM_BOOTSTRAP_ADMIN=bootstrap-nutfes-bingo-admin \
  mise run prod:admin:bootstrap

rm -f /tmp/nutfes-admin-password
```

作成後にAdminが存在することを確認します。

```bash
mise run prod:admin:list
mise run prod:admin:verify
```

メールによるパスワードリセットは使いません。Adminパスワードを再設定する場合は、対象emailと確認用環境変数を明示してAuth Admin APIから更新します。

```bash
# 12文字以上のパスワードを入力して保存します
nano /tmp/nutfes-admin-password
chmod 0600 /tmp/nutfes-admin-password

ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD_FILE=/tmp/nutfes-admin-password \
CONFIRM_RESET_ADMIN_PASSWORD=reset-nutfes-bingo-admin-password \
  mise run prod:admin:reset-password

rm -f /tmp/nutfes-admin-password
```

## コマンド方針

- package managerはpnpmだけを使います。依存関係の追加・削除は `mise run add <pkg>`、`mise run add -D <pkg>`、`mise run remove <pkg>` を使います
- アプリ起動は `mise run up`、停止は `mise run down` です
- 静的チェックは `mise run check` です
- production build確認は `docker build --build-arg NEXT_PUBLIC_SITE_URL=https://app.example.test --tag nutfes-bingo:test .` で実行します
- `.env`、`.env.production`、`.env*.local` はcommitしません
- 生成した `.env.production` と `.env.production.local` は、issue、PR、archive、screenshot、agent transcriptにも共有しません。露出した場合は、Cloudflare tunnel token、Postgres password、JWT/JWKS/API keys、S3 protocol credentials、`NUTFES_PUBLIC_ACTION_HASH_SALT` の順でrotateします

### Annual reproducible install

- このrepositoryのnpm registryは `.npmrc` の `https://npm.flatt.tech/` を必須とします。registry ownerが変更を決めるまではdeploy時に編集しません。
- 年次preflightでは `https://npm.flatt.tech/` が到達可能であることを確認します。
- registryが利用できない場合、deploy中に `.npmrc` をad hocに編集しません。review済みPRでregistryを切り替えるか、CIで作成済みのapp image digestを使用します。

### Annual maintenance checklist

1. `mise install`
2. `mise run install`
3. `pnpm audit --audit-level moderate`
4. `pnpm outdated`
5. apply grouped dependency updates
6. `mise run check`
7. `pnpm doctor`
8. `pnpm knip`
9. `mise run prod:config`
10. `NUTFES_ALLOW_NON_LXC=1 mise run prod:preflight` for local/CI config validation
11. Docker build or release workflow
12. staging restore + smoke before production deploy

### Intentional tooling choices

- oxlint/oxfmt are the lint/format tools; do not add ESLint/Prettier unless replacing them.
- `skipLibCheck` is intentional for dependency churn, but annual updates should watch type package majors.
- Knip ignores generated DB types and admin script intentionally.

## Branch 命名規則

新機能の Branch 名：feature/issue○○/title[isuue の簡単な説明]

修正の Branch 名：fix/issue○○/title[issue の簡単な説明]

## PR 命名規則

新機能：[add] title

編集・修正：[fix] title

削除：[del] title
