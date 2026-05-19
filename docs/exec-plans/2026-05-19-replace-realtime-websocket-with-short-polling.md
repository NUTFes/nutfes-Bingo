# WebSocketリアルタイム配信をショートポーリングへ移行する

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

このリポジトリには `PLANS.md` は存在しない。この文書は `/home/tkymhrt/.agents/skills/execplan/references/PLANS.md` の方法論に従い、単独で読んでも実装できるように必要な前提を本文へ含める。

## Purpose / Big Picture

現在の nutfes-Bingo は、公開ユーザーのブラウザが Supabase Realtime へ WebSocket 接続し、ビンゴ番号、景品情報、アンケート状態、リーチ数、リアクションスタンプを受け取っている。本番環境では Cloudflare Tunnel 経由の同時 WebSocket 接続が約350程度で頭打ちになる現象があり、想定する600から1000人規模、同時接続約500ユーザーを満たせない。

この計画の完了後、公開画面と管理画面は WebSocket を保持せず、短時間で完了するHTTP GETを定期的に実行して最新状態を取得する。管理者が番号を追加すると参加者画面は約2秒以内に更新され、アンケートや景品状態も数秒以内に反映される。会場スクリーンのスタンプはスクリーン専用APIを短周期で読むため、一般参加者全員が高頻度ポーリングを行うことはない。ブラウザDevToolsのNetworkタブで `/supabase/realtime/v1/websocket` が発生しないことを確認できる。

## Progress

- [x] (2026-05-19 00:00 JST) `README.md`、ADRテンプレート、既存実装を確認し、既存の ExecPlan が存在しないことを確認した。
- [x] (2026-05-19 00:00 JST) `src/lib/realtime.ts` の Supabase Realtime 購読箇所と、それを使う画面を洗い出した。
- [x] (2026-05-19 00:00 JST) Cloudflare Tunnel、Supabase Realtime、Next.js Cache Components の公開ドキュメントを確認し、設計判断を `docs/adr/ADR-001-replace-public-realtime-websocket-with-short-polling.md` に記録した。
- [x] (2026-05-19 19:02 JST) ショートポーリングAPIのレスポンス型とサーバー共通ヘルパーを追加した。
- [x] (2026-05-19 19:02 JST) 公開状態、景品、スクリーン、スタンプ用の Route Handler を追加した。
- [x] (2026-05-19 19:02 JST) `src/lib/realtime.ts` の購読フックを `src/lib/polling.ts` のポーリングフックへ置き換えた。
- [x] (2026-05-19 19:02 JST) ホーム、景品、スクリーン、管理画面の import と状態受け渡しを更新した。
- [x] (2026-05-19 19:02 JST) Server Actions の戻り値とキャッシュ失効をポーリング前提へ調整した。
- [x] (2026-05-19 20:58 JST) 動作確認、ビルド、負荷試験を実施した。

## Surprises & Discoveries

- Observation: ホーム画面は `src/features/user/home/home-page.tsx` で `useNumbers`、`src/components/user/Layout/Layout.tsx` で `useAppState` を呼ぶため、1ページ内で複数の Supabase クライアントが生成される。
  Evidence: `src/lib/realtime.ts` の各hookは `useEffect` 内で `createClient()` を呼び、個別に `.channel(...).subscribe()` している。

- Observation: 会場スクリーンは `useNumbers`、`useLatestReachLog`、`subscribeStampTriggers` の3系統を購読しているが、スタンプを受信する必要があるのは通常1台のスクリーンだけである。
  Evidence: `src/features/user/screen/screen-page.tsx` はスタンプ受信時に Matter.js の物理オブジェクトを生成して画面へ落としている。

- Observation: 既存の `src/lib/queries.ts` は Next.js Cache Components の `use cache`、`cacheTag`、`cacheLife` をすでに使っている。
  Evidence: `getNumbers`、`getPrizes`、`getAppState`、`getLatestReachLog` がタグ付きキャッシュを定義している。

- Observation: `serverTime` を含むレスポンス全体からETagを作ると、データが変わっていなくても毎回ETagが変わり、304応答にならない。
  Evidence: `src/app/api/bingo/state/route.ts`、`src/app/api/bingo/prizes/route.ts`、`src/app/api/bingo/screen/route.ts` はレスポンスに現在時刻を含めるため、`jsonWithEtag` に安定した `etagSource` を渡す実装にした。

- Observation: Next.js 16.1.6 の Cache Components では Route Handler の `export const dynamic = "force-dynamic"` がビルドエラーになる。
  Evidence: `pnpm exec next build --webpack` は `Route segment config "dynamic" is not compatible with nextConfig.cacheComponents. Please remove it.` を返したため、4つのAPI Route Handlerから `dynamic` 宣言を削除した。削除後の `pnpm run build` は成功し、ビルド結果では `/api/bingo/state`、`/api/bingo/prizes`、`/api/bingo/screen`、`/api/bingo/stamps` が `ƒ (Dynamic)` と表示された。

- Observation: ホストから `.env` の `https://nutfes-bingo.localhost/supabase` に接続するには、Caddy のローカルCAを Node に渡す必要がある。
  Evidence: `curl -I https://nutfes-bingo.localhost/supabase/rest/v1/` は証明書検証で失敗し、`curl -I --cacert caddy-local-root.crt ...` は `HTTP/2 200` を返した。ビルドは `NODE_EXTRA_CA_CERTS=caddy-local-root.crt` を付けて実行した。

## Decision Log

- Decision: 公開画面のデータ受信は Supabase Realtime ではなく Next.js Route Handler 経由のショートポーリングへ移行する。
  Rationale: 500ユーザー規模で長寿命WebSocketを積み上げる構成そのものを避けるため。SSEやロングポーリングも接続保持が残るため、今回の主制約には合いにくい。
  Date/Author: 2026-05-19 / Codex

- Decision: APIはデータドメインごとではなく画面用途ごとにまとめる。ホーム用は番号とアプリ状態、景品用は景品とアプリ状態、スクリーン用は番号と最新リーチ数を返す。
  Rationale: `useNumbers` と `useAppState` のような複数hookをそのまま個別ポーリングにするとHTTPリクエスト数が増える。画面が同時に必要とするデータをまとめると、500ユーザー時の総リクエスト数を抑えやすい。
  Date/Author: 2026-05-19 / Codex

- Decision: リアクションスタンプだけはスクリーン専用のカーソルポーリングにする。
  Rationale: スタンプを受け取るのは会場スクリーンであり、一般参加者全員に高頻度ポーリングを持たせる必要がない。`stamp_triggers.id` は単調増加するため、`id > lastSeenId` で取りこぼしにくい。
  Date/Author: 2026-05-19 / Codex

- Decision: 移行直後は Supabase Realtime の publication 設定を削除しない。
  Rationale: もし本番直前に問題が見つかった場合、フックを戻すだけで旧方式へ戻せる余地を残す。安定後に別マイグレーションとして削除する方が安全である。
  Date/Author: 2026-05-19 / Codex

- Decision: ETagはレスポンス全体ではなく、画面データ本体から生成する。
  Rationale: 各APIはデバッグと時刻同期のため `serverTime` を返すが、これをETag対象にすると未変更時の304応答が成立しない。`numbers`、`appState`、`prizes`、`latestReachLog` のような実データだけをETag対象にすれば、本文の再送とReact状態更新を避けられる。
  Date/Author: 2026-05-19 / Codex

- Decision: サーバー用ETagヘルパーは `src/lib/polling-server.ts` に置く。
  Rationale: 当初案の `src/lib/polling/server.ts` はクライアント用 `src/lib/polling.ts` と同名パスを共有する。Next.js の解決を単純にし、クライアントモジュールとサーバー専用モジュールの境界を読み取りやすくするため、独立したファイル名にした。
  Date/Author: 2026-05-19 / Codex

- Decision: Cache Components が有効なため、Route Handler では `dynamic = "force-dynamic"` を使わない。
  Rationale: Next.js 16.1.6 はこの組み合わせをビルド時に拒否する。APIは `Request`、`NextRequest`、`Cache-Control`、タグ付き `use cache` 関数の組み合わせで運用し、ビルド成果物上もDynamic Routeとして扱われることを確認した。
  Date/Author: 2026-05-19 / Codex

## Outcomes & Retrospective

2026-05-19に実装を完了した。`src/lib/realtime.ts` を削除し、公開画面、景品画面、会場スクリーン、管理画面は `src/lib/polling.ts` のショートポーリングhookを使う。`rg -n "@/lib/realtime|channel\\(|postgres_changes|subscribe\\(" src` は一致なしで、ブラウザ用コードから Supabase Realtime 購読は消えた。

`pnpm fmt`、`pnpm lint`、`pnpm exec tsc --noEmit` は成功した。`NODE_EXTRA_CA_CERTS=caddy-local-root.crt pnpm run build` は成功し、4つの `/api/bingo/*` Route Handler がDynamic Routeとして出力された。`pnpm start` で production server を起動し、`/`、`/prizes`、`/screen`、`/api/bingo/state`、`/api/bingo/prizes`、`/api/bingo/screen`、`/api/bingo/stamps?after=0` がHTTP 200を返すこと、`If-None-Match` 付きの `/api/bingo/state` がHTTP 304を返すことを確認した。

負荷試験は `pnpm load:polling` で実施した。500クライアント相当、60秒、2秒間隔で `/api/bingo/state` を読み、合計13,957リクエスト、ステータス分布は `200:500, 304:13457`、エラー0、p95レイテンシ6ms、最大90msだった。

## Context and Orientation

このアプリは Next.js App Router と Supabase を使うビンゴアプリである。公開ユーザーは `/` でビンゴ番号、`/prizes` で景品、`/screen` で会場スクリーンを見る。管理者は `/admin` と `/admin/prizes` で番号や景品、アンケート状態を変更する。

「ショートポーリング」とは、ブラウザが一定間隔でHTTP GETを送り、その時点の最新状態を受け取る方式である。WebSocket のように1本の接続を開いたままにしない。各リクエストは短時間で完了するため、Cloudflare Tunnel とオリジンの長寿命接続数を増やしにくい。

「ETag」とは、HTTPレスポンスの内容を表す短い識別子である。サーバーはレスポンスに `ETag` ヘッダーを付け、ブラウザは次回リクエストで `If-None-Match` を送る。内容が同じならサーバーは `304 Not Modified` を返し、本文を送らない。この計画では、JSON化したスナップショットのSHA-256ハッシュをETagに使う。

「ジッター」とは、全ユーザーが同じタイミングでAPIを叩かないように、ポーリング間隔へ小さなランダム差分を足すことである。たとえば2秒間隔なら、実際には1.7秒から2.3秒程度に散らす。

現在のリアルタイム購読は `src/lib/realtime.ts` に集約されている。このファイルはブラウザ用の `"use client"` モジュールであり、各hookが `createClient()` で Supabase ブラウザクライアントを生成して `.channel(...).on("postgres_changes", ...).subscribe()` している。該当hookは `useNumbers`、`usePrizes`、`useAppState`、`useLatestReachLog`、`subscribeStampTriggers` である。

サーバー側の読み取りは `src/lib/queries.ts` にある。`getNumbers` は `numbers` を `id` 昇順で取得し、`getPrizes` は `prizes` を取得して画像URLを解決し、`getAppState` は `app_state` の1行を取得し、`getLatestReachLog` は最新の `reach_logs` を取得する。これらは `cacheTag` と `cacheLife` を使っている。

DB schema は `supabase/migrations/20260313000000_initial_schema.sql` にある。`numbers`、`prizes`、`app_state`、`reach_logs`、`stamp_triggers` が公開読み取り可能で、最後の `do $$ ... $$` ブロックでこれらのテーブルを `supabase_realtime` publication に追加している。この publication は移行直後には残してよい。

管理者や参加者の書き込みは Server Actions で行われる。番号とアンケートは `src/features/admin/dashboard/actions.ts`、景品は `src/features/admin/prizes/actions.ts`、リーチとスタンプは `src/features/user/actions/bingo-public.ts` にある。既存実装は書き込み後に `invalidateTag` または `revalidateTag(tag, "max")` を呼んでいる。

## Plan of Work

まず、HTTPポーリングのための型と共通ヘルパーを追加する。`src/types/bingo/polling.ts` を作成し、ホーム状態、景品状態、スクリーン状態、スタンプイベントのレスポンス型を定義する。`src/lib/polling-server.ts` を作成し、JSONレスポンスにETagとCache-Controlを付ける処理、`If-None-Match` が一致したときに304を返す処理、SHA-256ハッシュを作る処理を置く。このファイルはサーバー専用なので `import "server-only";` を先頭に置く。`serverTime` はレスポンスに含めるが、ETagは画面データ本体から生成する。

次に、Route Handlerを追加する。`src/app/api/bingo/state/route.ts` は `getNumbers()` と `getAppState()` を呼び、`{ numbers, appState, serverTime }` を返す。`src/app/api/bingo/prizes/route.ts` は `getPrizes()` と `getAppState()` を呼び、`{ prizes, appState, serverTime }` を返す。`src/app/api/bingo/screen/route.ts` は `getNumbers()` と `getLatestReachLog()` を呼び、`{ numbers, latestReachLog, serverTime }` を返す。これら3つは `Cache-Control: public, max-age=0, s-maxage=1, stale-while-revalidate=4` を基本にする。Cache Components では `export const dynamic = "force-dynamic";` がビルドエラーになるため宣言しない。`src/app/api/bingo/stamps/route.ts` は `after` クエリを数値として読み、`stamp_triggers` から `id > after` の行を `id` 昇順で最大100件返す。スタンプAPIは `Cache-Control: no-store` にする。

`src/lib/queries.ts` には `getStampTriggersAfter(afterId: number, limit: number)` と `getLatestStampTriggerId()` を追加する。前者はスタンプAPI用、後者は `/screen` の初期カーソル用である。`stamp_triggers.id` は主キーなので、`id > afterId order by id asc limit N` は既存の主キーインデックスで処理できる。`getNumbers`、`getAppState`、`getLatestReachLog` の `cacheLife` は番号・アンケート・リーチの体感遅延に合わせて短くする。目安は `stale: 1, revalidate: 2, expire: 30` である。`getPrizes` は更新頻度が低いので `stale: 5, revalidate: 30, expire: 120` 程度にする。

次に、ブラウザ用のポーリングフックを作る。`src/lib/polling.ts` を作成し、共通関数 `usePollingJson` を実装する。このhookは、前回ETagを保持し、次回 `If-None-Match` を送る。レスポンスが200ならJSONを読み、React状態を更新する。304なら何もしない。失敗したら短いバックオフを行い、連続失敗時は最大30秒程度まで伸ばす。`setInterval` ではなく、1回のfetch完了後に次の `setTimeout` を予約し、遅いリクエストが重ならないようにする。`document.visibilityState` が `hidden` のときはホームと景品の間隔を15秒程度まで伸ばし、`visible` に戻ったら即時fetchする。会場スクリーンは表示中に使うため、スタンプポーリングの可視状態制御は弱めるか、少なくとも長くしすぎない。

`src/lib/polling.ts` からは画面用途に合ったhookを公開する。`useHomePollingState(initialNumbers, initialAppState)` は `/api/bingo/state` を2秒前後で取得し、番号とアプリ状態を返す。`usePrizesPollingState(initialPrizes, initialAppState)` は `/api/bingo/prizes` を5秒前後で取得し、景品とアプリ状態を返す。`useScreenPollingState(initialNumbers, initialReachLog)` は `/api/bingo/screen` を1秒から1.5秒前後で取得し、番号と最新リーチを返す。`useStampTriggerPolling(initialCursor, onInsert)` は `/api/bingo/stamps?after=<cursor>` を500ミリ秒前後で取得し、返ってきたスタンプを順に `onInsert` へ渡して、最後の `id` を次回カーソルにする。管理画面用には既存の呼び出し差分を小さくするため、必要に応じて `useNumbersPolling(initialNumbers)` と `usePrizesPolling(initialPrizes)` も用意し、setterを返せる形にする。

画面側を更新する。`src/components/user/Layout/Layout.tsx` は `useAppState` を呼ばないようにし、親から `appState` を受け取ってアンケートモーダルの表示判定に使う。`src/features/user/home/home-page.tsx` は `useHomePollingState` を呼び、返ってきた `numbers` で番号表示を作り、返ってきた `appState` を `Layout` へ渡す。`src/features/user/prizes/prizes-page.tsx` は `usePrizesPollingState` を呼び、景品リストと `Layout` の `appState` に使う。`src/app/(user)/screen/page.tsx` は `getLatestStampTriggerId()` を追加で呼び、`ScreenPage` へ `initialStampCursor` を渡す。`src/features/user/screen/screen-page.tsx` は `useScreenPollingState` と `useStampTriggerPolling` を使い、既存の Matter.js 表示処理は `onInsert` の中身として残す。

管理画面も WebSocket 依存を外す。`src/features/admin/dashboard/dashboard-page.tsx` は `useNumbers` の import を `@/lib/polling` のhookへ変える。番号の作成・更新・削除後に即時反映したいので、hookは `[numbers, setNumbers]` を返せるようにするか、Server Action の戻り値を使ってローカル状態を更新する。`src/features/admin/prizes/prizes-page.tsx` と `src/features/admin/prizes/prize-create-page.tsx` も `usePrizes` をポーリング版へ変える。既存の `PrizeResult` は `setBingoPrize` を受け取る設計なので、ポーリング版も setter を維持すると差分が小さい。

Server Actions を調整する。`src/features/admin/dashboard/actions.ts` の `createNumber` は `insert(...).select("*").single()` で作成行を返す。`deleteNumber` は `delete().eq("number", number).select("*").single()` で削除行を返す。`updateNumber` は `update(...).select("*").single()` で更新行を返す。`saveSurveyState` は更新後の `app_state` 行を返す。`incrementReach` と `decrementReach` は既に数値を返しているので、必要なら画面側の楽観更新に使う。`src/features/user/actions/bingo-public.ts` の `sendReactionStamp` は挿入した `stamp_triggers` 行を返してもよいが、スクリーンへの反映はスタンプAPIのカーソルポーリングで確認する。

キャッシュ失効は `updateTag` を優先する。`src/components/admin/server-actions.ts` の `invalidateTag` は `revalidateTag(tag, "max")` ではなく `updateTag(tag)` を呼ぶ実装へ変更する。`src/features/user/actions/bingo-public.ts` のローカル `invalidateTag` も同じ方針にする。Next.js のビルドで `updateTag` が使えないことが分かった場合だけ、`revalidateTag(tag, "max")` に戻し、`cacheLife` を短くする。判断は `pnpm build` の結果で行う。

最後に旧リアルタイム実装を外す。全importが `@/lib/polling` に移ったことを `rg "@/lib/realtime|useNumbers|usePrizes|useAppState|subscribeStampTriggers" src` で確認する。参照が残っていなければ `src/lib/realtime.ts` を削除する。Supabase Realtime publication の削除はこの計画では行わない。公開画面の本番安定を確認した後、別マイグレーションで判断する。

## Concrete Steps

作業ディレクトリは常に `/home/tkymhrt/ghq/github.com/NUTFes/nutfes-Bingo` とする。

1.  現状確認を行う。

        pwd
        git status --short
        rg -n "channel\\(|postgres_changes|subscribe\\(|@/lib/realtime" src

    期待する状態は、`src/lib/realtime.ts` とそれを import する画面が表示されることである。作業前に未コミット変更があっても、この計画と無関係な変更は戻さない。

2.  型とサーバーヘルパーを追加する。

    `src/types/bingo/polling.ts` を作成し、少なくとも次の型を定義する。

        import type {
          AppStateRow,
          NumberRow,
          PrizeWithImageUrl,
          ReachLogRow,
          StampTriggerRow,
        } from "@/types/bingo/types";

        export type BingoStateResponse = {
          numbers: NumberRow[];
          appState: AppStateRow;
          serverTime: string;
        };

        export type PrizeStateResponse = {
          prizes: PrizeWithImageUrl[];
          appState: AppStateRow;
          serverTime: string;
        };

        export type ScreenStateResponse = {
          numbers: NumberRow[];
          latestReachLog: ReachLogRow | null;
          serverTime: string;
        };

        export type StampEventsResponse = {
          stamps: StampTriggerRow[];
          nextCursor: number;
          serverTime: string;
        };

    `src/lib/polling-server.ts` を作成し、ETag付きJSONレスポンスを返す関数を置く。`import "server-only";` を先頭に置く。`new TextEncoder()` と `crypto.subtle.digest("SHA-256", bytes)` で本文ハッシュを作り、16進文字列にして `ETag` に使う。`request.headers.get("if-none-match")` が一致したら、同じ `ETag` と `Cache-Control` を付けた304レスポンスを返す。`serverTime` はレスポンスに含めるがETagの計算対象から外す。

3.  `src/lib/queries.ts` を拡張する。

    `StampTriggerRow` を import 対象へ追加し、次の関数を加える。

        export async function getStampTriggersAfter(afterId: number, limit = 50): Promise<StampTriggerRow[]> {
          ...
        }

        export async function getLatestStampTriggerId(): Promise<number> {
          ...
        }

    `getStampTriggersAfter` は `id > afterId`、`order("id", { ascending: true })`、`limit(Math.min(Math.max(limit, 1), 100))` を使う。`getLatestStampTriggerId` は `order("id", { ascending: false }).limit(1).maybeSingle()` で最新IDを返し、行がなければ0を返す。

4.  Route Handlerを追加する。

    `src/app/api/bingo/state/route.ts`、`src/app/api/bingo/prizes/route.ts`、`src/app/api/bingo/screen/route.ts`、`src/app/api/bingo/stamps/route.ts` を作成する。Cache Components と互換にするため `export const dynamic = "force-dynamic";` は宣言しない。通常状態APIは `jsonWithEtag(request, body, "public, max-age=0, s-maxage=1, stale-while-revalidate=4", etagSource)` のように返す。スタンプAPIは `no-store` を使う。

5.  ブラウザ用hookを追加する。

    `src/lib/polling.ts` を作成する。`"use client";` を先頭に置く。共通hookは `AbortController` でアンマウント時にfetchを中断し、`setTimeout` を片付ける。レスポンスが `response.status === 304` のときは状態更新しない。`response.ok` でない場合はエラーとして扱い、次回間隔を伸ばす。正常応答では次回間隔を基本値へ戻す。

6.  公開画面をポーリングへ移行する。

    `src/components/user/Layout/Layout.tsx` から `useAppState` import と呼び出しを削除し、propsで受け取った `appState` を使う。`src/features/user/home/home-page.tsx`、`src/features/user/prizes/prizes-page.tsx`、`src/features/user/screen/screen-page.tsx` を新hookへ更新する。`src/app/(user)/screen/page.tsx` は `getLatestStampTriggerId()` を呼び、`ScreenPage` のpropsに `initialStampCursor` を追加する。

7.  管理画面をポーリングへ移行する。

    `src/features/admin/dashboard/dashboard-page.tsx`、`src/features/admin/prizes/prizes-page.tsx`、`src/features/admin/prizes/prize-create-page.tsx` の `@/lib/realtime` import をなくす。番号と景品のローカルsetterが必要な箇所では、ポーリングhookが返すsetterを使う。

8.  Server Actionsを調整する。

    `src/features/admin/dashboard/actions.ts` の番号操作と `saveSurveyState` は更新後の行を返す。`src/components/admin/server-actions.ts` と `src/features/user/actions/bingo-public.ts` のキャッシュ失効を `updateTag` ベースに変える。`src/features/admin/prizes/actions.ts` は既に景品行を返しているため、主にキャッシュ失効だけを確認する。

9.  旧Realtime実装を削除する。

        rg -n "@/lib/realtime|channel\\(|postgres_changes|subscribe\\(" src

    検索結果が意図したものだけになったら `src/lib/realtime.ts` を削除する。認証フォームの Supabase ブラウザクライアントは WebSocket ではなく Auth 用なので残してよい。

10. 整形、静的検査、ビルドを実行する。

    pnpm fmt
    pnpm lint
    pnpm build

`pnpm build` が環境変数不足で失敗する場合は、`.env.example` に従って `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を設定して再実行する。ローカルCaddyの内部CAを使うHTTPS構成でビルドする場合は、READMEの手順でCaddyルート証明書を取り出し、`NODE_EXTRA_CA_CERTS=caddy-local-root.crt pnpm run build` のように実行する。

11. 手動確認を行う。

    pnpm dev

ブラウザで `http://localhost:3000/`、`http://localhost:3000/prizes`、`http://localhost:3000/screen`、`http://localhost:3000/admin` を開く。ローカルのDocker + Caddy構成を使う場合は `README.md` に従って `mise run supabase:start` と `mise run docker:up` を使い、`https://nutfes-bingo.localhost` で確認する。

## Validation and Acceptance

静的検査として `pnpm fmt`、`pnpm lint`、`pnpm build` が成功することを必須とする。テストスクリプトは現状 `package.json` に存在しないため、追加しない限り `pnpm test` は実行しない。

ブラウザDevToolsのNetworkタブで、公開画面、景品画面、会場スクリーンを開いても `/supabase/realtime/v1/websocket` への WebSocket 接続が発生しないことを確認する。`/api/bingo/state`、`/api/bingo/prizes`、`/api/bingo/screen`、`/api/bingo/stamps` へのGETが発生し、未変更時に304が返ることを確認する。

管理画面で番号を追加し、参加者ホーム画面と会場スクリーンに2.5秒以内に反映されることを確認する。番号を削除または更新した場合も、表示が2.5秒以内に一致することを確認する。

管理画面でアンケート配信をONにし、参加者ホーム画面または景品画面で2.5秒以内にアンケートモーダルが表示されることを確認する。OFFにした場合はモーダルが閉じる、または再表示されない状態へ戻ることを確認する。

管理画面で景品の当選状態を切り替え、景品画面で5秒以内に表示が更新されることを確認する。景品の作成、編集、削除も同じくポーリングで最終的にサーバー状態と一致することを確認する。

参加者画面からリーチを送信し、会場スクリーンのリーチ数が2秒以内に更新されることを確認する。連続送信や管理者による増減でも、最新の `reach_logs.reach_num` とスクリーン表示が一致することを確認する。

参加者画面からリアクションスタンプを送信し、会場スクリーンに1秒以内にスタンプが落ちることを確認する。スクリーンをリロードした直後に古いスタンプが大量に再生されないことも確認する。

負荷試験では、500クライアント相当が `/api/bingo/state` を2秒間隔で読み続ける状況を再現する。新しい依存を増やさずに行う場合は、Node.js の `fetch` を使う一時スクリプトを `scripts/poll-load-test.mjs` として追加し、500個の非同期ループが60秒間GETするようにする。成功条件は、WebSocket関連エラーが出ないこと、5xxが継続しないこと、p95レイテンシが運用上許容できる範囲に収まることである。負荷試験スクリプトを恒久的に残すなら `package.json` に `load:polling` を追加し、残さないなら検証後に削除する。

## Idempotence and Recovery

Route Handler とhookの追加は加算的に進められる。途中で問題が出た場合は、画面側のimportを `@/lib/realtime` に戻すことで旧方式へ戻せる。Supabase Realtime publication はこの計画では削除しないため、DB側のロールバックは不要である。

Server Actions の戻り値を増やす変更は既存呼び出しに対して後方互換である。既存コードが戻り値を無視しても問題はない。`updateTag` への変更でビルドまたは実行時に問題が出た場合は、`revalidateTag(tag, "max")` へ戻し、ポーリングAPIの `cacheLife` と `s-maxage` を短くして鮮度を担保する。

ポーリングhookはアンマウント時に `AbortController.abort()` と `clearTimeout()` を行う。これにより、ページ遷移やReact Strict Modeの再マウントでリクエストが積み残らない。

スタンプAPIは `after` カーソルに依存する。もしカーソル処理の不具合でスタンプが再生されない場合は、暫定的に `/screen` の初期カーソルを0にして全履歴再生を許すのではなく、`getLatestStampTriggerId()` と `id > after` の実装を優先して直す。全履歴再生はイベント当日に画面を埋める危険がある。

## Artifacts and Notes

主な既存依存関係は以下である。

       src/lib/realtime.ts
         useNumbers, usePrizes, useAppState, useLatestReachLog, subscribeStampTriggers

       src/features/user/home/home-page.tsx
         useNumbers(initialNumbers)

       src/components/user/Layout/Layout.tsx
         useAppState(initialAppState)

       src/features/user/screen/screen-page.tsx
         useNumbers(initialNumbers)
         useLatestReachLog(initialReachLog)
         subscribeStampTriggers(...)

       src/features/admin/dashboard/dashboard-page.tsx
         useNumbers(initialNumbers)

       src/features/admin/prizes/prizes-page.tsx
       src/features/admin/prizes/prize-create-page.tsx
         usePrizes(initialPrizes)

Supabase Realtime publication は `supabase/migrations/20260313000000_initial_schema.sql` の末尾にある。この計画では変更しない。

       alter publication supabase_realtime add table public.numbers;
       alter publication supabase_realtime add table public.prizes;
       alter publication supabase_realtime add table public.app_state;
       alter publication supabase_realtime add table public.reach_logs;
       alter publication supabase_realtime add table public.stamp_triggers;

## Interfaces and Dependencies

`src/types/bingo/polling.ts` に次の公開型が存在すること。

       export type BingoStateResponse = {
         numbers: NumberRow[];
         appState: AppStateRow;
         serverTime: string;
       };

       export type PrizeStateResponse = {
         prizes: PrizeWithImageUrl[];
         appState: AppStateRow;
         serverTime: string;
       };

       export type ScreenStateResponse = {
         numbers: NumberRow[];
         latestReachLog: ReachLogRow | null;
         serverTime: string;
       };

       export type StampEventsResponse = {
         stamps: StampTriggerRow[];
         nextCursor: number;
         serverTime: string;
       };

`src/lib/polling-server.ts` に次のサーバー専用関数が存在すること。

       export async function jsonWithEtag(
         request: Request,
         body: unknown,
         cacheControl: string,
         etagSource?: unknown,
       ): Promise<Response>;

`src/lib/queries.ts` に次の関数が存在すること。

       export async function getStampTriggersAfter(
         afterId: number,
         limit?: number,
       ): Promise<StampTriggerRow[]>;

       export async function getLatestStampTriggerId(): Promise<number>;

`src/lib/polling.ts` に次のブラウザ用hookが存在すること。

       export function useHomePollingState(
         initialNumbers: NumberRow[],
         initialAppState: AppStateRow,
       ): { numbers: NumberRow[]; appState: AppStateRow; setNumbers: React.Dispatch<React.SetStateAction<NumberRow[]>> };

       export function usePrizesPollingState(
         initialPrizes: PrizeWithImageUrl[],
         initialAppState: AppStateRow,
       ): { prizes: PrizeWithImageUrl[]; appState: AppStateRow; setPrizes: React.Dispatch<React.SetStateAction<PrizeWithImageUrl[]>> };

       export function useScreenPollingState(
         initialNumbers: NumberRow[],
         initialReachLog: ReachLogRow | null,
       ): { numbers: NumberRow[]; latestReachLog: ReachLogRow | null };

       export function useStampTriggerPolling(
         initialCursor: number,
         onInsert: (stamp: { name: StampName; id: number }) => void,
       ): void;

`src/app/api/bingo/state/route.ts`、`src/app/api/bingo/prizes/route.ts`、`src/app/api/bingo/screen/route.ts`、`src/app/api/bingo/stamps/route.ts` はすべてGETを実装する。状態APIはETagに対応し、スタンプAPIは `after` と `limit` クエリに対応する。

`src/components/user/Layout/Layout.tsx` のpropsは、内部で購読するための `initialAppState` ではなく、親から渡された現在値としての `appState` を受け取る。名前を変える場合は、すべての呼び出し元を同時に更新する。

Revision note 2026-05-19: 初版を作成した。Cloudflare Tunnel 経由のWebSocket同時接続頭打ちを避けるため、公開画面の通信方式をショートポーリングへ移行する方針、実装順序、検証方法を記録した。

Revision note 2026-05-19: 実装完了後の実態に合わせ、Progress、Surprises & Discoveries、Decision Log、Outcomes & Retrospective、検証結果を更新した。Next.js 16 Cache Components と `dynamic = "force-dynamic"` の非互換、ETag計算対象からの `serverTime` 除外、500クライアント相当の負荷試験結果を追記した。
