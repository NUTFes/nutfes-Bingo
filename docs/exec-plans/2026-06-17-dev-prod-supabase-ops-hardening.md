# 開発・本番Supabase起動環境と運用を整理する

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

この文書は `/home/tkymhrt/.agents/skills/execplan/references/PLANS.md` の形式に従って維持する。作業ディレクトリは `/home/tkymhrt/ghq/github.com/NUTFes/nutfes-Bingo` である。

## Purpose / Big Picture

開発者が `mise run dev` だけでDocker上のNext.js、Caddy、Supabase CLI local development stackを起動できるようにする。本番ではlocal stackを使わず、固定したSupabase self-hosted構成だけを `DEPLOY_MODE=vps mise run prod:up` などで扱う。完了後、開発者は本番self-host stackを常用せずに同一オリジンHTTPSのローカル環境を再現でき、運用者は本番のmigration、backup、restore、rollback、監視入口、公開面の方針をREADMEから判断できる。

## Progress

- [x] (2026-06-17 11:30 JST) 既存README、ADR、ExecPlan、Compose、mise、CI、Supabase利用箇所を確認した。
- [x] (2026-06-17 11:30 JST) 公式Supabase local development/self-hosting docsとDocker Compose startup order docsを確認した。
- [x] (2026-06-17 11:30 JST) Supabase利用箇所がAuth、PostgREST、Storageに限られ、Realtime、Edge Functions、Analytics、Studio、Inbucket、Vector、imgproxy、postgres-metaはアプリ実行に不要であることをコード検索で確認した。
- [x] (2026-06-17 11:45 JST) 開発起動タスクをDocker統一に変更し、Supabase CLI local stackとアプリComposeを固定networkで接続した。
- [x] (2026-06-17 11:45 JST) 本番Composeと運用ドキュメントをSRE観点で補強し、floating image、公開面、healthcheck、backup/restore/rollback手順を見直した。
- [x] (2026-06-17 11:45 JST) README、UPSTREAM、CI、mise task一覧を更新した。
- [x] (2026-06-17 11:50 JST) formatter、lint、typecheck、build、Compose config、開発Compose起動、health/ready疎通で検証した。

## Surprises & Discoveries

- Observation: `pnpm exec supabase` を並列実行すると、Supabase CLI 2.105.0が `~/.supabase/telemetry.json` のrename競合で失敗することがある。
  Evidence: `supabase start --help` と `supabase --version` を並列実行した際、`ENOENT: no such file or directory, rename '/home/tkymhrt/.supabase/telemetry.json.tmp...'` で失敗した。`SUPABASE_TELEMETRY_DISABLED=1` を付けた単独実行は成功した。

- Observation: 現在の `compose.dev.yml` はSupabase CLIが生成する `supabase_network_nutfes-Bingo` という外部network名へ直接依存している。
  Evidence: `compose.dev.yml` の `networks.supabase_network_nutfes-Bingo.external = true` と `Caddyfile` の `reverse_proxy supabase_kong_nutfes-Bingo:8000`。

- Observation: Docker開発Composeはservice role keyをアプリへ渡していない。
  Evidence: `compose.dev.yml` の app service environment は `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` のみで、`src/lib/supabase/admin.ts` が必要とする `SUPABASE_SERVICE_ROLE_KEY` がない。

- Observation: Supabase CLI 2.105.0の `start --exclude` で指定できるサービス名は、既存の `supabase/config.toml` の見出し名と一部異なる。
  Evidence: `inbucket`、`functions`、`analytics`、`meta` を指定すると警告が出た。CLI help上の有効名に合わせ、`mailpit`、`edge-runtime`、`logflare`、`postgres-meta`、`supavisor` を使うよう修正した。

- Observation: Supabase CLI local stackの起動時に「0.0.0.0へbindする」という汎用警告が表示されるが、固定network作成時の `com.docker.network.bridge.host_binding_ipv4=127.0.0.1` は実際の公開portに効いている。
  Evidence: `docker ps` でKongは `127.0.0.1:54321->8000/tcp`、DBは `127.0.0.1:54322->5432/tcp` と表示された。

## Decision Log

- Decision: 開発はSupabase CLI local development stackを `nutfes-bingo-dev` という固定Docker networkへ起動し、アプリ/Caddy Composeも同じnetworkへ接続する。
  Rationale: 公式Supabase docsはCLIがDocker containerでlocal stackを管理する前提を示しており、`--network-id` を使えばアプリコンテナからKongへ安定して到達できる。生成network名へ依存するより明示的である。
  Date/Author: 2026-06-17 / Codex

- Decision: 開発のdefault起動ではRealtime、Studio、Inbucket、Edge Runtime、Functions、Analytics、Vector、imgproxy、postgres-metaを除外する。
  Rationale: コードベースで利用が確認できるSupabase機能はAuth、PostgREST、Storageだけであり、未使用サービスを常時起動しない方が軽く安全である。
  Date/Author: 2026-06-17 / Codex

- Decision: 本番のSupabase StudioとDozzleはdefault stackに含めず、公開しない方針をREADMEで明示する。
  Rationale: Studioはアプリ実行経路に不要で、公開すると管理面の攻撃対象になる。DozzleはDocker socketを必要とするため、常時起動より `docker compose logs` とSSH経由の限定利用を基本にする方が安全である。
  Date/Author: 2026-06-17 / Codex

- Decision: Docker開発ではSupabase CLIが返す `PUBLISHABLE_KEY` を `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` に使い、service role JWTを `SUPABASE_SERVICE_ROLE_KEY` に使う。
  Rationale: CLI 2.105.0のlocal stackはlegacy anon keyに加えてpublishable/secret keyを返す。ブラウザ向け変数名に合わせてpublishable keyを優先し、サーバーのRLS bypassには既存コードが期待するservice role JWTを渡す。
  Date/Author: 2026-06-17 / Codex

## Outcomes & Retrospective

`mise run dev` をDocker開発環境の入口へ変更し、固定network `nutfes-bingo-dev` 上でSupabase CLI local stackとCaddy/Next.js dev containerを接続した。`compose.dev.yml` はservice role key、site URL、public action saltを受け取り、Caddy imageも固定tagになった。本番側はapp healthcheckを `/api/ready` へ寄せ、CIでdev/prod/cloudflare Compose configを検証するようにした。

検証ではSupabase local stackがAuth、Kong、PostgREST、Storage、PostgreSQLだけで起動し、`https://nutfes-bingo.localhost/api/health` と `/api/ready` が200を返した。`pnpm run fmt:check`、`pnpm exec tsc --noEmit`、`pnpm run build` は成功した。`pnpm run lint` は終了コード0だが、既存の `.agents/skills/impeccable` 配下に警告を出す。

## Context and Orientation

`mise.toml` は開発者向けの単一入口である。現状の `tasks.dev` はホストで `pnpm dev` を実行するだけなので、Docker統一という目的を満たしていない。`compose.dev.yml` はCaddyとNext.js dev serverを起動するが、Supabase CLI local stackのnetwork名に直接依存している。`supabase/config.toml` はlocal stackのサービス有効/無効を管理するファイルで、Auth、REST API、Storageは有効、RealtimeやStudioなどは無効になっている。

`compose.prod.yml` は本番用self-hosted Supabaseを含む基底Composeである。ここではPostgreSQL、Auth、PostgREST、Storage、Kong、migration job、Next.js app、Caddyを起動する。`compose.vps.yml` はCaddyを80/443で公開するoverride、`compose.cloudflare.yml` はcloudflaredを使うoverrideである。本番の永続データは `SUPABASE_DB_DATA_PATH` と `SUPABASE_STORAGE_DATA_PATH` に置く。

## Plan of Work

最初に `mise.toml` を開発の入口にする。`dev:network` で固定Docker networkを作り、`supabase:start` で `pnpm exec supabase start --network-id` と `--exclude` を使って必要サービスだけを起動する。`dev` はSupabase CLIの `status -o env` を読み、local anon keyとservice role keyを環境変数として `docker compose -f compose.dev.yml up --build` に渡す。`docker:up` は互換aliasとして `dev` へ寄せる。

次に `compose.dev.yml` と `Caddyfile` を固定network前提へ直す。Caddy imageは本番と同じく固定tagを使う。アプリコンテナには `NEXT_PUBLIC_SITE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`NUTFES_PUBLIC_ACTION_HASH_SALT` を渡す。Caddyはlocal Supabase Kongへ `/supabase/*` をproxyし、アプリはCaddyのlocal CAを信頼してサーバー側fetchも同一オリジンURLで動けるようにする。

本番側は大きく作り替えず、healthcheck、floating image、ログ/Studio/socket公開、migration dry-run、backup/restore/rollback手順を安全側へ補強する。必要ならmise taskを追加し、複雑な処理は既存の `infra/scripts/*.sh` に残す。

最後にREADMEへ「devはCLI local、prodはself-hosted」という境界、公式Docsに寄せた更新方針、Supabase機能の採否根拠、mise task一覧、CIで検証するCompose configを記録する。

## Concrete Steps

作業ディレクトリは `/home/tkymhrt/ghq/github.com/NUTFes/nutfes-Bingo` とする。

1. `mise.toml` の `dev`、`docker:*`、`supabase:*`、`prod:*` taskを整理する。
2. `compose.dev.yml` と `Caddyfile` を固定networkとlocal key注入に対応させる。
3. `compose.prod.yml` のhealthcheckとimage指定を見直す。
4. `.github/workflows/ci.yml` にCompose config検証を追加し、Node/pnpm versionを `mise.toml` に揃える。
5. `README.md`、`infra/supabase/UPSTREAM.md`、このExecPlanを更新する。
6. `pnpm run fmt:check`、`pnpm run lint`、`pnpm run build`、`docker compose config` 系を実行する。

## Validation and Acceptance

`mise run dev` はSupabase CLI local stackと開発Composeを起動し、`https://nutfes-bingo.localhost` でアプリに到達できる状態になる。`mise run dev:down` は開発Composeとlocal stackを停止する。本番は `DEPLOY_MODE=vps mise run prod:config` と `DEPLOY_MODE=cloudflare CLOUDFLARE_TUNNEL_TOKEN=dummy mise run prod:config` が成功し、default stackにStudio、Realtime、Functions、Analytics、Dozzleが含まれないことをCompose configで確認できる。

静的検証として `pnpm run fmt:check`、`pnpm run lint`、`pnpm run build` が成功する。CIは同じNode/pnpm versionでinstall、format、lint、typecheck、build、Compose config検証を行う。

## Idempotence and Recovery

`dev:network` はnetworkが存在する場合は何もしない。`supabase:start` はlocal stackを再利用し、設定変更時は `mise run supabase:stop` 後に再実行できる。`dev:down` はアプリComposeを止めてからSupabase local stackを止めるが、通常はDB volumeを削除しない。本番のbackupはtimestamp directoryへ新規作成し、restoreは `CONFIRM_RESTORE=restore-nutfes-bingo` がない限り実行しない。rollbackはbackup restoreと以前のCompose/image tagへ戻す手順として文書化する。

## Artifacts and Notes

公式Docsで確認した前提は次の通りである。Supabase local developmentはCLIとDockerでlocal stackを起動する。Supabase self-hosting docsは、不要なRealtime、Storage、imgproxy、Edge Runtimeを削れると説明している。Docker Compose docsは、ready待ちにはhealthcheckと `depends_on.condition: service_healthy` または `service_completed_successfully` を使うと説明している。

## Interfaces and Dependencies

開発用Docker network名は `SUPABASE_DOCKER_NETWORK` で上書き可能にし、defaultは `nutfes-bingo-dev` とする。local公開URLは `https://nutfes-bingo.localhost`、local Supabase URLは `https://nutfes-bingo.localhost/supabase` とする。Supabase CLIから取得した `PUBLISHABLE_KEY` を優先して `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` へ渡し、`SERVICE_ROLE_KEY` を `SUPABASE_SERVICE_ROLE_KEY` としてアプリComposeへ渡す。

Revision note 2026-06-17: 初版を作成し、現状調査、公式Docs確認、設計判断を記録した。

Revision note 2026-06-17: 実装、検証結果、Supabase CLIのexclude名とlocal port bindの発見事項を反映した。
