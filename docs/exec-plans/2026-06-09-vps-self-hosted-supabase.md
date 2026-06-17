# VPS直接公開とself-hosted Supabase基盤を実装する

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

## Purpose / Big Picture

Cloudflare Tunnelを使えないVPSでも、Docker ComposeとCaddyだけでHTTPS公開できるようにする。同時に、アプリが利用する最小限のself-hosted Supabaseをこのリポジトリで管理し、初期構築、migration、seed、typegen、backup、restoreを再現可能にする。今回Storageは維持し、負荷試験は実施しない。

完了後は、基底ComposeへVPS直接公開またはCloudflare Tunnelのoverrideを重ねて起動できる。PostgreSQL、Auth、PostgREST、Storage、KongはDocker内部networkだけで動き、外部公開されるSupabase経路は管理者Authに必要なパスへ限定される。

## Progress

- [x] (2026-06-09 JST) 現行のCompose、Caddy、Supabase利用箇所、ADRを確認した。
- [x] (2026-06-09 JST) Supabase公式self-hosting資料とupstream Docker構成を確認し、固定commitを決めた。
- [x] (2026-06-09 JST) ADR-004を追加し、ADR-002をsupersedeする判断を記録した。
- [x] (2026-06-09 JST) 最小Supabase stackを含む基底Composeを実装した。
- [x] (2026-06-09 JST) VPS直接公開とCloudflare Tunnelのoverrideを実装した。
- [x] (2026-06-09 JST) secrets、migration、seed、typegen、backup、restoreの運用スクリプトを実装した。
- [x] (2026-06-09 JST) READMEと環境変数例を更新した。
- [x] (2026-06-09 JST) 静的検証、Compose検証、起動、疎通、backup/restore検証を行った。

## Surprises & Discoveries

- Observation: 現行のSupabase CLIはpackage dependencyに固定されておらず、`npx supabase`が実行時の取得に依存していた。
  Evidence: `package.json`に`supabase`がなく、`mise.toml`は`npx supabase`を実行していた。

- Observation: ブラウザがSupabaseへ直接接続する用途は管理者Authに限定され、DBとStorage操作はNext.jsサーバー経由だった。
  Evidence: browser clientはlogin/signupでのみ利用され、Storage upload/removeはServer Action、画像取得はRoute Handlerを経由している。

- Observation: Supabase公式の現在の基底ComposeはKongがStudioへ依存するため、Studioを削る場合はKongの依存関係と宣言設定を明示的に調整する必要がある。
  Evidence: upstream commit `99f0518` の `docker/docker-compose.yml` でKongはStudioのhealthcheckを待つ。

- Observation: Edge Functionsを削ると`supabase_functions_admin`が作成されないため、公式`roles.sql`をそのまま使うとDB初期化が途中で停止する。
  Evidence: 初回統合起動で`role "supabase_functions_admin" does not exist`となり、Storageロールのpassword設定と後続migrationが未適用になった。

- Observation: Supabase CLI 2.105.0の`db push --db-url`はCompose内部の非TLS DBに対してURL queryの`sslmode=disable`だけでは通常実行時にTLSを要求した。
  Evidence: `PGSSLMODE=disable`をservice環境変数へ設定すると、非対話migrationが安定して完了した。

- Observation: Supabase公式DBでは初期化後の`postgres`が非superuserへ降格される。また`pg_graphql`のACLはイメージとdumpの関数signature差分でrestoreを止める可能性がある。
  Evidence: restoreを`supabase_admin`で実行し、未使用の`graphql_public.graphql` ACLだけを除外する二段階restoreでDB、権限、Storageを復元できた。

- Observation: ローカルSupabaseの既存PostgreSQL 17 volumeは、productionへ合わせたPostgreSQL 15設定では再利用できない。
  Evidence: 既存volumeではversion incompatibilityとなったが、別project IDの新規volumeではmigration、seed、typegenが成功した。

## Decision Log

- Decision: Supabase upstream commit `99f0518137da8ca05cc78cb083e3488a38a573e8` のイメージバージョンと初期化ファイルを基準にする。
  Rationale: Supabase公式は組み合わせて検証したComposeのイメージタグを使うことを推奨しており、個別latest追従を避けるため。
  Date/Author: 2026-06-09 / Codex

- Decision: Storageは残すがimgproxyを削除し、画像変換を無効化する。
  Rationale: 管理画面の景品画像upload/removeはStorage APIに依存する一方、画像変換APIは利用していないため。
  Date/Author: 2026-06-09 / Codex

- Decision: production migrationはSupabase CLIの`db push --db-url`を一回実行するone-shot Compose serviceで行う。
  Rationale: migration履歴を`supabase_migrations.schema_migrations`で管理し、適用済みSQLの再実行を避けるため。
  Date/Author: 2026-06-09 / Codex

- Decision: disaster recovery backupはDBの完全なcustom-format dump、global roles、Storageファイルを同じbackup directoryへ保存する。
  Rationale: Supabase Storageの実体はDB dumpに含まれず、DBメタデータとファイルの両方が必要なため。
  Date/Author: 2026-06-09 / Codex

## Outcomes & Retrospective

基底ComposeへPostgreSQL、Auth、PostgREST、Storage、Kong、migration job、Next.js、Caddyを統合し、VPS直接公開とCloudflare Tunnelをoverrideで選択できるようにした。ブラウザ公開はAuth経路だけに限定し、RESTとStorageはDocker内部へ閉じた。

生成した秘密情報を使う新規DBで全serviceがhealthyになり、3件のmigration、冪等seed、Auth設定、Storage upload/download/delete、アプリreadyを確認した。書き込み後にbackupをrestoreし、DB値、migration履歴、seedデータ、Storage実体がbackup時点へ戻ることも確認した。

負荷試験とStorage削除は今回の範囲外として実施していない。`pnpm knip`は既存の`.agents/skills/impeccable/`配下を未使用fileとして報告するため失敗するが、今回差分に起因するものではない。

## Context and Orientation

`compose.prod.yml`を基底にし、Next.js app、Caddy、Kong、Auth、PostgREST、Storage、PostgreSQLを定義する。直接公開時は`compose.vps.yml`を追加し、Caddyへ80/443を割り当てる。Cloudflare利用時は`compose.cloudflare.yml`を追加し、cloudflaredから内部Caddyへ接続する。

Supabase公式由来のKong設定とPostgreSQL初期化SQLは`infra/supabase/`へ置く。アプリschemaは既存の`supabase/migrations/`を正とし、production DBへはCLIで適用する。

## Plan of Work

最初に公式Supabase構成から必要なサービスと初期化ファイルだけを導入し、イメージタグを固定する。Kong設定からStudio、Realtime、Functions、postgres-metaのrouteを除き、Auth、REST、Storageだけを定義する。Storageでは画像変換を無効化し、DBとStorageを環境変数指定のbind mountへ保存する。

次にCaddyを公開方式非依存にし、site addressを環境変数で切り替える。VPS overrideでは公開DNS名と80/443を使用し、Cloudflare overrideでは`:8080`とcloudflaredを使用する。Caddyは`/supabase/auth/v1/*`だけをKongへ転送し、その他の`/supabase/*`を拒否する。

次にSupabase CLIをdevDependencyとして固定し、local configとmise taskを整える。production migration用のone-shot service、明示的seed、typegen、secrets生成、backup、restore、smoke testを追加する。

最後にREADMEへ初回構築、更新、通常起動、停止、backup、restore、公開方式切替、ファイアウォール、DNS、ファイル権限を記録する。

## Concrete Steps

作業ディレクトリは `/home/tkymhrt/ghq/github.com/NUTFes/nutfes-Bingo` とする。

1. `infra/supabase/`へKong設定とDB初期化ファイルを追加する。
2. `compose.prod.yml`を最小self-hosted Supabase込みの基底構成へ変更する。
3. `compose.vps.yml`と`compose.cloudflare.yml`を追加する。
4. `Caddyfile.prod`を公開API制限とsite address切替に対応させる。
5. `.env.production.example`を統合された環境変数例へ更新する。
6. `supabase/config.toml`、CLI dependency、mise taskを追加する。
7. secrets、migration、seed、backup、restore、smoke testスクリプトを追加する。
8. `README.md`とADR/ExecPlanを更新する。
9. formatter、lint、build、Compose config、実スタックで検証する。

## Validation and Acceptance

`pnpm fmt:check`、`pnpm lint`、`pnpm build`が成功すること。各Compose組み合わせが`docker compose config`を通ること。テスト用環境変数でstackがhealthyになり、migrationとseedを適用後に`/api/health`と`/api/ready`が200になること。管理者Auth endpointとStorage画像経路が応答すること。backupを作成し、別の一時Compose projectまたは初期化したテストDBへrestoreできること。

## Idempotence and Recovery

Compose起動とmigrationは再実行可能にする。seedは初期データが存在する場合に景品を重複投入しない。backupはtimestampごとの新規directoryへ書き込み、既存backupを上書きしない。restoreは明示的な確認環境変数がなければ実行しない。構築失敗時はvolumeを削除せずComposeを停止し、ログと設定を修正して再起動する。

## Artifacts and Notes

想定経路は次の通りである。

    VPS direct: Internet -> Caddy:443 -> Next.js / Kong(Auth only)
    Cloudflare: Internet -> Cloudflare -> cloudflared -> Caddy:8080
    Server API: Next.js -> Kong:8000 -> Auth / PostgREST / Storage -> PostgreSQL

## Interfaces and Dependencies

`PUBLIC_DOMAIN`はVPS直接公開時のDNS名である。`CADDY_SITE_ADDRESS`は直接公開ではそのDNS名、Tunnelでは`:8080`を指定する。`NEXT_PUBLIC_SUPABASE_URL`は公開URLの`/supabase`、`SUPABASE_SERVER_URL`は`http://kong:8000`とする。

DBとStorageの永続化先は`SUPABASE_DB_DATA_PATH`と`SUPABASE_STORAGE_DATA_PATH`で指定する。productionではリポジトリ外の絶対pathを使用する。

Revision note 2026-06-09: 初版を作成した。

Revision note 2026-06-09: 統合起動、seed、typegen、backup/restoreの実装結果と検証時の発見事項を反映した。
