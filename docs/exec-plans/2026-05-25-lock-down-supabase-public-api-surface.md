# Supabaseの公開API面をリリース前に閉じる

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

このリポジトリには `PLANS.md` は存在しない。この文書は `/home/tkymhrt/.agents/skills/execplan/references/PLANS.md` の方法論に従い、単独で読んでも実装できるように必要な前提を本文へ含める。

## Purpose / Big Picture

nutfes-Bingo は公開参加者が使う画面を Next.js の `/api/bingo/*` Route Handler 経由のショートポーリングへ移行済みである。それにもかかわらず Supabase の Security Advisor は、`anon` と `authenticated` がテーブルをGraphQL schemaで発見できること、`SECURITY DEFINER` 関数をRPCとして実行できること、公開Storage bucketを一覧できることを警告している。

この計画の完了後、公開参加者と通常のサインインユーザーは Supabase のData API、GraphQL、RPC、Storage listingからアプリ内部テーブルや関数へ直接到達できない。画面表示は引き続き Next.js の公開APIで動き、管理者操作は Server Action が管理者確認を行った後にサーバー専用 `SUPABASE_SERVICE_ROLE_KEY` で実行する。動作確認では `pnpm run lint` と `pnpm run build` が成功し、追加マイグレーションを読めば警告対象の grants、RPC execute、Storage select policy が撤去されたことを確認できる。

## Progress

- [x] (2026-05-25 00:00 JST) `README.md`、関連ADR、既存ExecPlan、Supabase migration、Supabase利用箇所を確認した。
- [x] (2026-05-25 00:00 JST) Security Advisor警告の原因が、公開ポーリング移行後も残っている `anon` / `authenticated` へのData API grants、公開読み取りRLS policy、Storage select policy、SECURITY DEFINER function execute grants であることを確認した。
- [x] (2026-05-25 00:00 JST) Supabaseの2026年方針として新規テーブルをData API/GraphQLへ自動公開しない方向へ移っていること、pg_graphqlの可視性がPostgres role権限で決まることを確認した。
- [x] (2026-05-25 00:00 JST) DB権限、Storage policy、Realtime publication、RPC function execute権限を閉じる migration を追加した。
- [x] (2026-05-25 00:00 JST) Next.jsサーバー側のDB読み取り、管理者Server Action、ready checkを `service_role` クライアントへ寄せた。
- [x] (2026-05-25 00:00 JST) `pnpm run fmt`、`pnpm run lint`、`pnpm exec tsc --noEmit` を実行して成功した。
- [ ] `pnpm run build` の完走確認。Turbopack build はcompile段階で停止し、webpack build は詳細なしの webpack errors で終了したため、今回の検証では未完了。
- [x] (2026-05-25 00:00 JST) 管理画面用の旧Realtime hook互換ポーリングを削除し、管理画面はServer Action戻り値によるローカル状態更新だけにした。
- [x] (2026-05-25 00:00 JST) dev/prod DockerとmiseのNodeを26 Currentから24 LTSへ戻し、Node 26由来の `module.register()` deprecation warningを避ける方針にした。
- [x] (2026-05-25 00:00 JST) 公開リーチ申告で公開クライアントCookieが無い場合にRuntime Errorになる問題を修正し、Server Action側でCookieを発行して続行するようにした。

## Surprises & Discoveries

- Observation: 公開画面はすでに Supabase Realtime 直接購読ではなく、Next.js Route Handler のショートポーリングへ移行済みだった。
  Evidence: `docs/exec-plans/2026-05-19-replace-realtime-websocket-with-short-polling.md` の Outcomes に `src/lib/realtime.ts` 削除と `/api/bingo/*` Route Handler 追加が記録され、`src/lib/queries.ts` がサーバー側の読み取りを集約している。

- Observation: 現在のサーバー側読み取りは `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を使っており、`anon` からの `SELECT` grant を取り除くとそのままでは `/api/bingo/*` と `/api/ready` が壊れる。
  Evidence: `src/lib/queries.ts` の `createDataClient()` と `src/app/api/ready/route.ts` は publishable key で Supabase client を作成している。

- Observation: 管理者Server Actionは `requireAdmin()` の後も認証済みユーザーの Supabase client で `numbers`、`prizes`、`app_state`、Storage を操作している。
  Evidence: `src/components/admin/server-actions.ts` の `createAdminClient()` は `requireAdmin()` 後に `src/lib/supabase/server.ts` の cookie-based client を返している。

- Observation: 公開Storage bucket `prize-images` の画像配信は object URL で足りており、bucket内のobject一覧を公開する必要はない。
  Evidence: 画像は `src/app/api/prize-images/[...path]/route.ts` が既知の `image_path` から `/storage/v1/object/public/prize-images/...` をproxyしている。アプリ内にStorage list APIの利用は見つからない。

- Observation: `pnpm exec tsc --noEmit` は最初、`.next/dev/types/validator.ts` の古い生成物を読んで失敗した。
  Evidence: エラーは `.next/dev/types/validator.ts(156,39): error TS2307: Cannot find module '../../../src/app/(admin)/admin/layout.js'` だった。`.next/dev` を削除後、同じ `tsc --noEmit` は成功した。

- Observation: clean後も `pnpm run build` は Next.js 16.2.6 のTurbopack compile段階で追加出力なしに停止した。`--webpack` では `Build failed because of webpack errors` のみが出力され、詳細は表示されなかった。
  Evidence: `.next/diagnostics/build-diagnostics.json` は `{"buildStage":"compile","buildOptions":{"useBuildWorker":"true"}}` で止まっていた。`NEXT_PRIVATE_BUILD_WORKER=0` でも同じcompile段階で停止した。

- Observation: Docker dev logの `GET /api/bingo/state 200` と続く `GET /api/bingo/state 304` は、公開画面がETag付きHTTPポーリングで動いている証拠であり、Realtime接続ではない。
  Evidence: `rg -n "channel\\(|postgres_changes|subscribe\\(" src` は一致なし。`src/lib/polling.ts` は `fetch()` と `If-None-Match` を使って `/api/bingo/*` を読む。

- Observation: `DEP0205 module.register()` warningはアプリのRealtime依存ではなく、Node 26 CurrentでNext/Turbopackが踏むランタイム非推奨警告だった。
  Evidence: Dockerfile、dev.Dockerfile、mise.toml は Node 26.2.0 を使っていた。Node.js公式リリース情報ではNode 26は2026-05時点でCurrent、Node 24はActive LTSである。

- Observation: 公開リーチ申告のRuntime Errorは、Supabase RPCではなく `nutfes_bingo_client_id` Cookieが無い状態で `recordPublicReach()` が呼ばれ、`getPublicActionClientHash()` が `PublicActionError` を投げることが原因だった。
  Evidence: エラー文言 `ページを再読み込みしてからもう一度お試しください。` は `src/lib/public-action-context.ts` の Cookie 検証失敗時だけで生成されていた。`src/lib/supabase/proxy.ts` はGETページ表示時にCookieを発行するが、初回やCookie欠落時のServer Action自体では復旧できていなかった。

## Decision Log

- Decision: `anon` と `authenticated` にはアプリテーブル、シーケンス、関数、`public` schema usageを付与しない。
  Rationale: 公開画面はNext.js Route Handlerを読むだけでよく、管理者画面のDB操作もServer Actionに閉じ込められる。Postgres grantを消せばPostgRESTとpg_graphqlの両方からテーブルが見えなくなる。
  Date/Author: 2026-05-25 / Codex

- Decision: サーバー側のデータ読み取りと管理者DB操作は `SUPABASE_SERVICE_ROLE_KEY` を使う。
  Rationale: `anon` / `authenticated` のData API grantsを撤去しても、Next.jsサーバーはDocker内部のSupabaseへ到達できる。管理者操作はServer Action入口で `requireAdmin()` を必ず通すため、service role keyをブラウザへ出さずに権限を集中できる。
  Date/Author: 2026-05-25 / Codex

- Decision: 公開bucketは維持するが、`storage.objects` の公開SELECT policyは削除する。
  Rationale: 景品画像は公開表示対象なのでobject URLで配信する。一方、bucket listingは不要であり、公開SELECT policyはパス一覧の漏えいにつながる。
  Date/Author: 2026-05-25 / Codex

- Decision: Supabase Realtime publication からアプリテーブルを外す。
  Rationale: 旧Realtime購読は削除済みで、公開画面はHTTPポーリングで動作している。リリース前でロールバック優先度より公開面縮小を優先する。
  Date/Author: 2026-05-25 / Codex

- Decision: 管理画面の常時ポーリングを削除する。
  Rationale: 管理画面の操作はServer Actionの戻り値でローカル状態を更新しており、旧Realtime hook互換の `useNumbersPolling` / `usePrizesPolling` は不要だった。削除すると管理画面から余計な `/api/bingo/state` と `/api/bingo/prizes` への定期アクセスが消える。
  Date/Author: 2026-05-25 / Codex

- Decision: Node 26 CurrentではなくNode 24 LTSをDockerとmiseで使う。
  Rationale: リリース前の運用ではCurrent系の非推奨警告を追うより、Active LTSへ寄せる方がログが静かで再現性も高い。
  Date/Author: 2026-05-25 / Codex

## Outcomes & Retrospective

2026-05-25に実装を完了した。`supabase/migrations/20260525000000_lock_down_public_api_surface.sql` を追加し、`anon` / `authenticated` から `public` schema usage、app table privileges、sequence privileges、function executeを撤去した。公開読み取りRLS policy、Storage listing policy、旧Realtime publicationも削除し、RPCとして残す公開操作関数は `service_role` 専用にした。

アプリ側では `src/lib/queries.ts`、`src/app/api/ready/route.ts`、`src/lib/auth/auth.ts`、`src/components/admin/server-actions.ts` をservice role clientへ寄せた。管理者操作は引き続き `requireAdmin()` を通してからservice roleでDB操作する。

追加で、管理画面用の互換ポーリングhookを削除した。公開参加者画面と会場スクリーンだけが `src/lib/polling.ts` のhookで `/api/bingo/*` を読む。管理者画面は初期SSRデータとServer Actionの戻り値だけで状態を更新する。Docker dev logの `304` はETagが効いている正常なポーリング結果である。

Dockerfile、dev.Dockerfile、mise.tomlはNode 24 LTSへ変更した。Node 26 Currentで出ていた `module.register()` deprecation warningはNext/Turbopack側の警告であり、アプリコード由来ではない。

公開リーチ申告とリアクション送信のクライアント識別は、Server Action内でも不足時に `nutfes_bingo_client_id` を発行できるようにした。これにより、GETページ表示時にCookieが発行されていない境界ケースでも「再読み込みしてください」のRuntime Errorで落ちず、同じ送信処理を継続できる。リーチ確認モーダルは送信中の二重押下を防ぎ、失敗時は未処理例外ではなくモーダル内のエラー表示へ落とす。

検証は `pnpm run fmt`、`pnpm run lint`、`pnpm exec tsc --noEmit` が成功した。`pnpm run lint` は既存の `.agents/skills/impeccable` 配下にwarningを出すが、exit codeは0で、今回触ったアプリコードのerrorはない。`pnpm run build` はNext.js buildがcompile段階で停止したため未完了である。

## Context and Orientation

このアプリは Next.js App Router と Supabase を使うビンゴアプリである。公開参加者は `/`、`/prizes`、`/screen` を開き、ブラウザは Next.js の `/api/bingo/state`、`/api/bingo/prizes`、`/api/bingo/screen`、`/api/bingo/stamps` をポーリングする。これらのAPIは `src/lib/queries.ts` からSupabaseを読み、JSONとETagを返す。

管理者は `/admin` と `/admin/prizes` を使う。管理者操作は `src/features/admin/dashboard/actions.ts` と `src/features/admin/prizes/actions.ts` の Server Action が受け取り、共通の `src/components/admin/server-actions.ts` で `requireAdmin()` を通してから Supabase を操作する。`requireAdmin()` は `src/lib/auth/auth.ts` にあり、Supabase Authの現在ユーザーと `public.profiles.role` を確認する。

Data APIとはSupabase/PostgRESTがPostgres tableやfunctionをHTTP endpointとして公開する仕組みである。GraphQLは `pg_graphql` がPostgres role権限からschemaを組み立てる仕組みである。RLSは「行単位で見えるデータを絞る」仕組みだが、Postgres grantはその前段で「roleがそのtable/functionへ到達できるか」を決める。今回の方針は、公開roleにgrantしないことでData APIとGraphQLの発見面そのものを閉じることである。

## Plan of Work

まず判断記録として `docs/adr/ADR-003-lock-down-supabase-public-api-surface.md` を追加する。既存のADR-001は「公開配信をRealtimeからショートポーリングへ移す」判断であり、今回はその後続として「Supabaseの直接公開面を閉じる」判断を記録する。

次に `supabase/migrations/20260525000000_lock_down_public_api_surface.sql` を追加する。このmigrationは `anon` と `authenticated` から `public` schema usage、app table privileges、sequence privileges、function executeをrevokeする。`numbers_read_all`、`prizes_read_all`、`app_state_read_all`、`reach_logs_read_all`、`stamp_triggers_read_all`、`prize_images_public_read` などの公開読み取りpolicyを削除し、必要なら `service_role` 専用policyだけを置く。`SECURITY DEFINER` が不要な公開操作関数は `SECURITY INVOKER` へ置き換え、RPCとして必要な関数は `service_role` にだけ `EXECUTE` をgrantする。旧Realtime publicationから `numbers`、`prizes`、`app_state`、`reach_logs`、`stamp_triggers` を外す。

次にTypeScriptを変更する。`src/lib/supabase/config.ts` に service role 環境変数チェックを追加し、`src/lib/queries.ts` は publishable key のSupabase clientではなく `src/lib/supabase/admin.ts` の `createServiceRoleClient()` を使う。`src/app/api/ready/route.ts` も同じservice role clientで `app_state` を読む。`src/lib/auth/auth.ts` は現在ユーザーの取得だけ cookie-based client を使い、`profiles` の読み取りは service role clientへ切り替える。`src/components/admin/server-actions.ts` は `requireAdmin()` 後に service role client を返す。

最後に検証する。`pnpm run fmt` で整形し、`pnpm run lint` で静的検査を通し、`pnpm run build` で Next.js build が通ることを確認する。Supabase local resetはDockerとローカルSupabase stackの状態に依存するため、必要なら別途実行するが、この計画の最低検証はmigrationのレビュー可能性とアプリの型・ビルド成功である。

## Concrete Steps

作業ディレクトリは常に `/home/tkymhrt/ghq/github.com/NUTFes/nutfes-Bingo` とする。

1.  現状を確認する。

        rtk git status --short
        rtk rg -n "from\\(\"(app_state|numbers|prizes|profiles|reach_logs|stamp_triggers)\"\\)|rpc\\(\" src

    期待する状態は、公開画面のブラウザコードではなく `src/lib/queries.ts`、Server Action、auth helper、ready route にSupabase accessが集中していることである。

2.  ADRとmigrationを追加する。

    `docs/adr/ADR-003-lock-down-supabase-public-api-surface.md` と `supabase/migrations/20260525000000_lock_down_public_api_surface.sql` を作成する。migrationは `begin;` と `commit;` で囲み、revokeやdrop policyは何度実行しても壊れにくいよう `if exists` を使う。

3.  サーバー側clientをservice role化する。

    `src/lib/supabase/config.ts`、`src/lib/queries.ts`、`src/lib/auth/auth.ts`、`src/components/admin/server-actions.ts`、`src/app/api/ready/route.ts` を更新する。ブラウザ用 `src/lib/supabase/client.ts` はAuthのログインとサインアップに使うため変更しない。

4.  検証する。

        rtk pnpm run fmt
        rtk pnpm run lint

    rtk pnpm exec tsc --noEmit
    rtk pnpm run build

`pnpm run build` は `NUTFES_SKIP_SUPABASE_FETCH=1 next build` なので、DB接続なしでも成功することを期待する。2026-05-25時点の検証では `fmt`、`lint`、`tsc --noEmit` は成功したが、`build` はcompile段階で停止して未完了だった。

## Validation and Acceptance

`pnpm run lint` が exit code 0 で完了すること。`pnpm exec tsc --noEmit` が exit code 0 で完了すること。`pnpm run build` が exit code 0 で完了すること。ただし2026-05-25時点ではbuild完走は未確認である。追加migrationには少なくとも次が含まれること。

- `anon` と `authenticated` から対象テーブルの privileges がrevokeされている。
- `anon` と `authenticated` から `public` schemaのfunction executeがrevokeされている。
- RPCとして使う `record_reach(text)`、`record_reaction_stamp(text, text)`、`increment_reach()`、`decrement_reach()` は `service_role` にだけexecute grantされている。
- `prize_images_public_read` policyが削除され、公開bucketのlistingが許可されない。
- Realtime publicationから公開画面用テーブルが外れている。

実環境ではmigration適用後にSupabase Security Advisorを再実行し、今回提示された `public_bucket_allows_listing`、`pg_graphql_anon_table_exposed`、`pg_graphql_authenticated_table_exposed`、`anon_security_definer_function_executable`、`authenticated_security_definer_function_executable` が消えることを受け入れ条件とする。

## Idempotence and Recovery

追加migrationは `drop policy if exists`、`revoke`、`grant`、`create or replace function`、publication存在確認つきの `alter publication` で構成するため、ローカル再適用で失敗しにくい。`revoke` は権限が存在しない場合でも成功する。Realtime publicationからtableを外す処理は `pg_publication` と `pg_publication_tables` を確認してから実行する。

ロールバックが必要な場合は、直前のDBバックアップを復元するのが最も安全である。リリース前環境で一時的に戻すだけなら、対象tableへ `grant select, insert, update, delete` と公開読み取りpolicyを戻し、Server Actionをcookie-based clientへ戻せば旧方式へ戻せる。ただし、その状態では今回のSecurity Advisor警告も戻る。

## Artifacts and Notes

作業開始時点の重要な証拠は次の通りである。

    src/lib/queries.ts は publishable key で numbers, prizes, app_state, reach_logs, stamp_triggers を読む。
    src/components/admin/server-actions.ts は requireAdmin() 後に service role Supabase client を返す。
    supabase/migrations/20260313000000_initial_schema.sql は public read policy と storage.objects の prize_images_public_read を作成している。
    supabase/migrations/20260521000000_public_operation_hardening.sql は公開書き込みRPCを service_role 経由へ寄せているが、increment_reach/decrement_reach/is_admin などのexecute権限はまだ公開roleに残りうる。

検証コマンドの結果は次の通りである。

    rtk pnpm run fmt
    Finished in 479ms on 266 files using 20 threads.

    rtk pnpm run lint
    Found 106 warnings and 0 errors.

    rtk pnpm exec tsc --noEmit
    exit code 0

    rtk pnpm run build
    Creating an optimized production build ... で停止。pkillで中断。

    rtk proxy env NUTFES_SKIP_SUPABASE_FETCH=1 pnpm exec next build --webpack
    > Build failed because of webpack errors

## Interfaces and Dependencies

`src/lib/supabase/admin.ts` の `createServiceRoleClient()` はサーバー専用であり、`SUPABASE_SERVICE_ROLE_KEY` と `SUPABASE_SERVER_URL` または `NEXT_PUBLIC_SUPABASE_URL` を必要とする。この関数をブラウザ用モジュールからimportしてはいけない。

`src/components/admin/server-actions.ts` の `createAdminClient()` は、呼び出し前に必ず `requireAdmin()` を実行し、その後 `createServiceRoleClient()` を返す。これにより、DB側はservice roleとして操作されるが、HTTP入口では管理者だけが実行できる。

Revision note 2026-05-25: 初版を作成した。Security Advisorの警告に対して、公開roleのgrants撤去、service_roleへのサーバー集約、Storage listing無効化、Realtime publication撤去を一つのリリース前hardeningとして扱う。
