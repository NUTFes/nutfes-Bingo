# Supabase upstream

このディレクトリのPostgreSQL初期化ファイル、Kong entrypoint、鍵生成スクリプトは、Supabase公式リポジトリの次のcommitを基準にしている。

- Repository: <https://github.com/supabase/supabase>
- Commit: `99f0518137da8ca05cc78cb083e3488a38a573e8`
- Source directory: `docker/`
- License: Apache License 2.0
- Official guide: <https://supabase.com/docs/guides/self-hosting/docker>

`volumes/api/kong.yml`は、このアプリが利用するAuth、PostgREST、Storageだけへrouteを限定するため、公式ファイルを基に縮小している。

`volumes/db/roles.sql`はEdge Functionsを起動しない構成に合わせ、存在しない`supabase_functions_admin`のパスワード更新を除外している。Realtimeサービスは起動しないが、既存migrationがpublicationを参照するため、DB初期化用の`realtime.sql`は残している。

更新時はSupabaseのself-hosted changelog、公式self-hosting docs、上記commit以降の`docker/`差分を確認し、DB/Storage backup後にイメージと設定をまとめて更新する。公式docsはDocker Compose setupの安定版が概ね月次で公開され、同じリリース内のimage versionは一緒に検証されていると説明している。そのため、upstream `master` をそのまま追従したり、個別イメージだけを無条件に `latest` へ更新したりしない。

更新作業の最小手順:

1. 新しいSupabase release tagまたは検証済みcommitを決める。
2. `docker/` 配下の `docker-compose.yml`、`.env.example`、`volumes/api/kong.yml`、`volumes/db/*.sql`、`utils/*.sh` の差分を確認する。
3. このリポジトリで起動しているサービス（PostgreSQL、Auth、PostgREST、Storage、Kong）に関係する差分だけを反映する。
4. `mise run prod:backup` で更新前backupを取得する。
5. stagingまたは一時環境で `prod:config`、migration dry-run、smoke test、backup/restoreを確認してから本番へ反映する。
