# ADR-005: Docker開発環境はSupabase CLI local stackを常用する

## Status

Accepted

## Date

2026-06-17

## Context

このリポジトリには開発用 `compose.dev.yml` と本番用 `compose.prod.yml` がある。本番用Composeはself-hosted Supabaseを含み、PostgreSQL、Auth、PostgREST、Storage、Kong、migration job、Next.js、Caddyをまとめて管理する。一方、開発ではSupabase CLIのlocal development stackを使う設定が `supabase/config.toml` にあり、Auth、REST API、Storage、PostgreSQLをローカルDockerで起動できる。

変更前の `mise run dev` はホスト上で `pnpm dev` を実行するだけで、Docker開発環境の入口ではなかった。`compose.dev.yml` はSupabase CLIが生成する外部network名に依存し、アプリコンテナへservice role keyも渡していなかった。そのため、開発者ごとの起動手順が分散し、本番self-hosted stackを開発で常用しやすい状態になっていた。

## Decision Drivers

- 開発者が単一コマンドで再現できること
- 開発では本番self-hosted stackを常用しないこと
- AppコンテナからSupabase local stackへ安定して接続できること
- 未使用Supabaseサービスをdefault起動しないこと
- 本番運用のComposeや永続データと開発環境を明確に分けること

## Options Considered

### Option 1: ホストで `pnpm dev`、SupabaseだけCLI local stackを使う

Pros:

- 起動が軽い。
- Next.jsの標準的なローカル開発に近い。

Cons:

- Node、pnpm、証明書、環境変数がホスト環境に依存する。
- Dockerで統一する要件を満たさない。
- Appコンテナからの接続問題を検証できない。

### Option 2: 開発も本番self-hosted Supabase Composeを常用する

Pros:

- 本番に近い構成で動く。
- Composeだけで全サービスを管理しやすい。

Cons:

- 開発で本番永続データ構成やself-hosted運用設定へ近づきすぎる。
- migration、backup、公開設定など本番向け責務を日常開発に持ち込む。
- Supabase CLI local developmentの公式フローから外れる。

### Option 3: Docker開発環境はSupabase CLI local stackを固定networkに起動し、アプリComposeから接続する

Pros:

- `mise run dev` でDockerベースの開発環境を再現できる。
- Supabase CLI local stackと本番self-hosted stackを明確に分離できる。
- `--network-id` によりApp/CaddyコンテナからKongへ安定して到達できる。
- CLI local stackのserviceを必要最小限に絞れる。

Cons:

- `supabase status -o env` からlocal keyをComposeへ渡す起動処理が必要になる。
- CaddyのローカルCA証明書をブラウザやコンテナで扱う必要がある。

## Decision

Option 3を採用する。

`mise run dev` は固定Docker network `nutfes-bingo-dev` を作成し、Supabase CLI local development stackを `pnpm exec supabase start --network-id nutfes-bingo-dev` で起動する。その後、`supabase status -o env` からlocal anon keyとservice role keyを取得し、`compose.dev.yml` のCaddy + Next.js dev containerを起動する。

開発のdefault Supabase serviceはAuth、Kong、PostgREST、Storage、PostgreSQLに限定する。コードベースで利用が確認できないRealtime、Studio、Inbucket、Edge Runtime/Functions、Analytics、Vector、imgproxy、postgres-metaはdefault起動しない。

## Rationale

Supabase公式のlocal development docsは、CLIがDocker containerでlocal Supabase stackを管理する前提を示している。開発ではこの公式フローに寄せる方が、migration、seed、typegenを含むローカルDB作業を扱いやすい。

本番self-hosted stackは公開、永続化、backup、restore、rollbackを含む運用対象であり、日常開発のdefaultにすると責務が混ざる。開発ではCLI local stack、本番ではself-hosted stackという境界を明確にすることで、本番データや公開設定への誤操作を避ける。

固定networkを使うことで、Supabase CLIが生成するnetwork名にComposeが依存しなくなる。AppコンテナはCaddy経由の同一オリジンURLを使い、Caddyは同じDocker network上のSupabase Kongへproxyする。

## Consequences

### Positive

- 開発者は `mise run dev` だけでDocker開発環境を起動できる。
- 本番self-hosted stackを開発defaultで起動しなくなる。
- service role key不足によるDocker開発時のServer Action/API失敗を避けられる。
- 未使用Supabaseサービスを起動せず、ローカルのリソース消費を減らせる。

### Negative

- Supabase CLIの `status -o env` 出力形式に起動タスクが依存する。
- CLI local stackのcontainer名はSupabase CLIの命名規則に依存する。

### Neutral / Trade-offs

- `pnpm dev` は必要ならホストで直接実行できるが、推奨入口ではない。
- Studioはdefault起動しないため、ローカルDB確認はSQL、CLI、または明示的に一時起動したツールを使う。

## Implementation Notes

- `mise.toml` の `dev` をDocker開発環境の入口にする。
- `SUPABASE_DOCKER_NETWORK` でnetwork名を上書きできるようにする。defaultは `nutfes-bingo-dev`。
- `supabase:start` は `--exclude realtime,studio,inbucket,edge-runtime,functions,analytics,vector,imgproxy,meta` を指定する。
- `compose.dev.yml` は外部network `nutfes-bingo-dev` にCaddyを接続する。
- `compose.dev.yml` のapp serviceには `SUPABASE_SERVICE_ROLE_KEY` と `NUTFES_PUBLIC_ACTION_HASH_SALT` を渡す。
- 本番self-hosted stackの起動は `prod:*` taskに限定する。

## Validation

- [x] `mise run supabase:start`
- [x] `mise run supabase:status`
- [x] `docker compose -f compose.dev.yml config --quiet`
- [x] production Compose config検証
- [x] Cloudflare override Compose config検証
- [x] `pnpm run fmt:check`
- [x] `pnpm run lint`
- [x] `pnpm exec tsc --noEmit`
- [x] `pnpm run build`
- [x] `https://nutfes-bingo.localhost/api/health`
- [x] `https://nutfes-bingo.localhost/api/ready`

## Related

- Related ADR: `docs/adr/ADR-004-vps-direct-publication-and-self-hosted-supabase.md`
- 実装計画: `docs/exec-plans/2026-06-17-dev-prod-supabase-ops-hardening.md`
