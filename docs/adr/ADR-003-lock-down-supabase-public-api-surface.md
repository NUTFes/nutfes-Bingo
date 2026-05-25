# ADR-003: SupabaseのData APIとGraphQLを公開roleから直接見せない

## Status

Accepted

## Date

2026-05-25

## Context

Supabase Security Advisorで、公開Storage bucket `prize-images` が一覧可能であること、`public.app_state`、`public.numbers`、`public.prizes`、`public.profiles`、`public.reach_logs`、`public.stamp_triggers` が `anon` と `authenticated` のGraphQL schemaに見えていること、複数の `SECURITY DEFINER` function が `anon` または `authenticated` からRPC実行可能であることが警告された。

このアプリはADR-001で公開画面をSupabase Realtime直接購読からNext.js Route Handler経由のショートポーリングへ移行済みである。公開参加者は `/api/bingo/*` を読むだけでよく、ブラウザがSupabaseのテーブルを直接読む必要はない。公開リーチ送信とリアクション送信も `SUPABASE_SERVICE_ROLE_KEY` を使うServer Action経由へ閉じている。

Supabaseは2026年に、新規テーブルをData APIとGraphQLへ自動公開しない方向へ変更している。pg_graphqlのtable/column可視性はPostgres roleの権限で決まり、`SELECT` をrevokeするとGraphQL typeも見えなくなる。RLSは行の可視性を制御するが、Postgres grantはData APIやGraphQLに対象が現れるかどうかを決める別レイヤーである。

## Decision Drivers

- 公開参加者がData API、GraphQL、RPC、Storage listingから内部構造を発見できないこと
- 管理者操作はServer Action入口で認証し、DB操作権限をブラウザへ出さないこと
- 公開画面の `/api/bingo/*` ショートポーリングは維持すること
- リリース前なので旧Realtime直接購読へのロールバック余地より公開面縮小を優先すること
- Supabase Security Advisorの対象警告を消せること

## Options Considered

### Option 1: 現状のRLSとgrantsを維持し、警告を許容する

Pros:

- 実装変更がない。
- 既存のSupabase client呼び出しを壊さない。

Cons:

- `anon` keyを持つ誰でもGraphQL schemaからtable名を発見できる。
- SECURITY DEFINER functionがRPC surfaceに残る。
- Storage object一覧が不要に公開される。
- 公開ポーリングへ移行した効果をDB権限面で活かせない。

### Option 2: RLS policyだけを厳しくし、grantsは残す

Pros:

- Supabase clientの呼び出し差分は比較的小さい。
- 行データ自体の漏えいはRLSで抑えられる。

Cons:

- pg_graphqlのschema可視性はrole権限に基づくため、`SELECT` grantが残る限りtableの存在は見える。
- PostgRESTのData API surfaceも残る。
- RPC execute警告とStorage listing警告には効かない。

### Option 3: 公開roleのgrantsとRPC executeを撤去し、Next.jsサーバーのservice role経由に集約する

Pros:

- `anon` と `authenticated` からData API/GraphQL table discoveryを閉じられる。
- SECURITY DEFINER functionを公開RPCから外せる。
- 管理者操作はServer Actionで `requireAdmin()` を通したうえでservice roleで実行できる。
- 公開画面の外部インターフェースは既存の `/api/bingo/*` のまま維持できる。

Cons:

- `SUPABASE_SERVICE_ROLE_KEY` が本番必須になる。
- サーバー側コードがservice role前提になり、Server Action入口での認証チェックがより重要になる。
- 管理者操作のDB側RLSではなくアプリサーバー側の入口制御に依存する部分が増える。

## Decision

Option 3を採用する。`anon` と `authenticated` からアプリテーブル、sequence、function、`public` schema usageの直接権限をrevokeする。公開読み取りRLS policyとStorage listing policyは削除し、必要なDB操作はNext.jsサーバーから `SUPABASE_SERVICE_ROLE_KEY` で実行する。

管理者Server Actionはこれまで通り `requireAdmin()` を入口で実行する。その後に使うSupabase clientをcookie-based authenticated clientではなくservice role clientへ変更する。公開参加者向けの `/api/bingo/*` は `src/lib/queries.ts` からservice roleで読み取る。

Storage bucket `prize-images` は画像表示のため公開bucketのままとする。ただし `storage.objects` の `SELECT` policyは削除し、object listingを許可しない。画像表示は既知の `image_path` から公開object URLをproxyする方式を維持する。

旧Supabase Realtime publicationから公開画面用テーブルを外す。公開画面はHTTPポーリングで動作しており、リリース前のhardeningとして不要な変更feedも閉じる。

## Rationale

今回の警告は、データ行がRLSで保護されているかだけではなく、公開roleがどのtableやfunctionを発見・実行できるかを問題にしている。公開参加者が必要とする情報はすでにNext.jsのRoute Handlerで整形して返しているため、SupabaseのData APIやGraphQLを公開roleへ見せる必要はない。

service role keyは強い権限を持つため、ブラウザへ絶対に露出させない。既存の構成では `SUPABASE_SERVICE_ROLE_KEY` は本番環境変数として用意済みであり、公開リーチ送信とリアクション送信ですでにServer Action経由に閉じて使っている。この使い方を読み取りと管理者操作にも統一する。

## Consequences

### Positive

- `anon` keyからPostgREST/GraphQLで内部tableを発見しにくくなる。
- SECURITY DEFINER functionを公開RPC surfaceから外せる。
- Storage bucket内のobject一覧を公開しなくなる。
- 公開画面と管理者画面の外部インターフェースはNext.jsへ集約される。

### Negative

- 本番で `SUPABASE_SERVICE_ROLE_KEY` が未設定だと、公開APIと管理者画面のDB読み書きが失敗する。
- Server Actionの `requireAdmin()` を外す変更が将来入るとservice role操作の危険度が高いため、レビューで特に注意する必要がある。
- Supabase Data APIを直接使う開発・デバッグ手順は、公開roleではなくservice roleまたはDB接続で行う必要がある。

### Neutral / Trade-offs

- RLSは引き続き有効にするが、通常運用の主な保護境界はNext.js API入口とPostgres grantsになる。
- GraphQL extension自体は削除しない。table grantsを閉じれば対象tableはGraphQL schemaから見えなくなるため、extension削除よりリスクが小さい。

## Implementation Notes

- `src/lib/queries.ts` は publishable key client ではなく `createServiceRoleClient()` を使う。
- `src/lib/auth/auth.ts` は現在ユーザー確認にはcookie-based clientを使い、`profiles` 読み取りにはservice role clientを使う。
- `src/components/admin/server-actions.ts` は `requireAdmin()` 後にservice role clientを返す。
- 管理者画面は常時ポーリングせず、初期SSRデータとServer Actionの戻り値でローカル状態を更新する。
- `src/app/api/ready/route.ts` はservice role keyが存在することと、service roleで `app_state` を読めることを確認する。
- migrationは `anon` / `authenticated` から table privileges、sequence privileges、function execute、schema usageをrevokeする。
- RPCで使う `record_reach(text)`、`record_reaction_stamp(text, text)`、`increment_reach()`、`decrement_reach()` は `service_role` にだけexecute grantする。
- `prize_images_public_read` は削除する。公開bucketのobject URLアクセス自体は維持する。

## Validation

- [x] `pnpm run fmt`
- [x] `pnpm run lint`
- [x] `pnpm exec tsc --noEmit`
- [ ] `pnpm run build`（2026-05-25時点ではNext.js compile段階で停止し未完了）
- [ ] Supabase migration適用後にSecurity Advisorを再実行し、今回の警告が消えること
- [ ] 本番相当環境で `/api/bingo/state`、`/api/bingo/prizes`、`/api/bingo/screen`、`/api/ready` が成功すること
- [ ] 管理者ログイン後、番号追加、番号削除、アンケート設定保存、景品更新、景品画像アップロードが成功すること

## Related

- Related ADR: `docs/adr/ADR-001-replace-public-realtime-websocket-with-short-polling.md`
- Related ADR: `docs/adr/ADR-002-production-docker-cloudflare-tunnel.md`
- 実装計画: `docs/exec-plans/2026-05-25-lock-down-supabase-public-api-surface.md`
- Supabase Data API grants change: https://github.com/orgs/supabase/discussions/45329
- pg_graphql security: https://github.com/supabase/pg_graphql/blob/master/docs/security.md
