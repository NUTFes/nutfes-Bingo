# Supabase upstream

このディレクトリのPostgreSQL初期化ファイル、Kong entrypoint、鍵生成スクリプトは、Supabase公式リポジトリの次のself-hosted release / commitを基準にしている。

- Repository: <https://github.com/supabase/supabase>
- Self-hosted release: `self-hosted/v0.6.0`（2026-06-17）
- Checked source commit: `e144628515a3712270a618bc5022983bac329ba2`
- Source directory: `docker/`
- License: Apache License 2.0
- Official guide: <https://supabase.com/docs/guides/self-hosting/docker>

このリポジトリは公式Composeのうち、Productionで必要なPostgreSQL、Auth、PostgREST、Storage、Kongだけを起動する。Studio、postgres-meta、Realtime、Edge Functions、imgproxy、Supavisor、Analytics、Vectorは起動しない。CloudflaredはNext.js appだけを公開し、Kong、PostgreSQL、Storageをpublic portやtunnelへ出さない。

`volumes/api/kong.yml`は、このアプリが利用するAuth、PostgREST、Storageだけへrouteを限定するため、公式ファイルを基に縮小している。Authの`/.well-known/oauth-authorization-server`は公式Auth routeとして残している。公式`self-hosted/v0.6.0`のRealtime `/api/tenants` / `/api/openapi` block routeは、Realtime route自体を持たないため反映不要。

`volumes/db/roles.sql`は現行サービスが接続に使う`authenticator`、`supabase_auth_admin`、`supabase_storage_admin`だけのパスワードを更新する。Realtime、Analytics、Supavisorを起動しないため、公式`realtime.sql`、`webhooks.sql`、`logs.sql`、`pooler.sql`、`_supabase.sql`は現行最小構成ではmountしない。

PostgreSQL imageは公式`self-hosted/v0.6.0`に合わせて`supabase/postgres:17.6.1.136`を`.env.production.example`の既定にしている。Cloudflaredは2026-07-04時点のlatestと同じ`cloudflare/cloudflared:2026.6.1`へpinし、`latest`はproduction preflightで拒否する。

公式の新API key運用に必要な`utils/add-new-auth-keys.sh`と`utils/rotate-new-api-keys.sh`は、公式版を保持している。`rotate-new-api-keys.sh`はopaque keyのみを更新し、JWKSや既存user sessionは変更しない。

`supabase/migrations/20260703000000_baseline.sql`はFresh DB前提の年次運用向けに、アプリschemaの既存migrationを1本化したbaseline。年1回の稼働前にDB/Storageを必ずresetし、新規data directoryへ作り直してから適用する。既存DBのmigration履歴へ上書き適用する用途ではない。

更新時はSupabaseのself-hosted changelog、公式self-hosting docs、上記release以降の`docker/`差分を確認し、DB/Storage backup後にイメージと設定をまとめて更新する。公式docsはDocker Compose setupの安定版が概ね月次で公開され、同じリリース内のimage versionは一緒に検証されていると説明している。そのため、upstream `master` をそのまま追従したり、個別イメージだけを無条件に `latest` へ更新したりしない。

更新作業の最小手順:

1. 新しいSupabase self-hosted release tagまたは検証済みcommitを決める。
2. `docker/` 配下の `docker-compose.yml`、`.env.example`、`volumes/api/kong.yml`、`volumes/db/*.sql`、`utils/*.sh` の差分を確認する。
3. このリポジトリで起動しているサービス（PostgreSQL、Auth、PostgREST、Storage、Kong）に関係する差分だけを反映する。
4. `mise run prod:backup` で更新前backupを取得する。
5. stagingまたは一時環境で `prod:config`、migration dry-run、smoke test、backup/restoreを確認してから本番へ反映する。
