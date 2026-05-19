# ADR-001: 公開画面のリアルタイム配信をWebSocketからショートポーリングへ移行する

## Status

Accepted

## Date

2026-05-19

## Context

nutfes-Bingo は、ビンゴ番号、景品情報、アンケート状態、リーチ数、リアクションスタンプをフロントエンドへリアルタイム配信している。現状の実装では `src/lib/realtime.ts` が Supabase Realtime の `postgres_changes` を購読し、`numbers`、`prizes`、`app_state`、`reach_logs`、`stamp_triggers` の5系統をブラウザから直接 WebSocket で受け取っている。

公開ユーザーのホーム画面では `src/features/user/home/home-page.tsx` の `useNumbers` と `src/components/user/Layout/Layout.tsx` の `useAppState` がそれぞれ Supabase クライアントを生成する。景品画面も `usePrizes` と `useAppState` を使う。会場スクリーンは `useNumbers`、`useLatestReachLog`、`subscribeStampTriggers` を使う。つまり、多くの画面で1ブラウザあたり複数の Supabase クライアントと WebSocket 購読が発生しやすい構造になっている。

本番アクセスは Cloudflare Tunnel 経由で行っており、約350同時 WebSocket 接続付近で頭打ちになる現象が観測されている。イベント想定は600から1000人規模で、同時接続約500ユーザーを見込む。Cloudflare Tunnel 側の観測上の制約に加えて、Supabase Realtime にはプランごとの同時接続数とメッセージ数の上限がある。2026-05-19時点のSupabase公式ドキュメントでは Realtime の同時接続上限は Free 200、Pro 500、Pro no spend cap / Team 10000 とされ、上限超過時は `too_many_connections` などの WebSocket エラーが返ると説明されている。

本アプリの公開配信データは、低遅延は必要だがミリ秒単位の双方向通信までは必要ない。ビンゴ番号とアンケート状態は1から2秒以内、景品情報は数秒以内、会場スクリーンのリーチ数は1から2秒以内、リアクションスタンプはスクリーン1台に対して1秒以内に反映できれば運用上は十分である。

## Decision Drivers

- 500人規模の公開ユーザーが接続しても長寿命コネクションを占有しないこと
- ビンゴ番号とアンケート配信の体感遅延を1から2秒程度に収めること
- 既存の Next.js Server Actions、Supabase schema、RLS、画面構成を大きく壊さないこと
- 当日運用で障害原因を切り分けやすく、段階的にロールバックできること
- 新しい外部マネージドサービスへの依存を増やさないこと

## Options Considered

### Option 1: Supabase Realtimeを維持してインフラと購読数を調整する

Pros:

- 既存実装との差分が小さい。
- 更新遅延が最も小さい。
- PostgreSQLの変更イベントをそのまま扱える。

Cons:

- 公開ユーザー数に比例して WebSocket 接続数が増える。
- 現状の画面構成では1ユーザーが複数の Supabase クライアントを生成しやすく、500ユーザー要件に対して余裕が少ない。
- Cloudflare Tunnel で観測されている同時接続頭打ちへの根本対策にならない。
- Supabase Realtime のプラン上限やメッセージ上限にも依存する。

### Option 2: Server-Sent Eventsまたはロングポーリングへ移行する

Pros:

- WebSocket 固有の制約を避けられる可能性がある。
- Push に近い実装ができ、ショートポーリングより遅延を小さくしやすい。

Cons:

- HTTP 接続を長時間保持するため、今回の「コネクションを占有しにくい方式にしたい」という要件に合いにくい。
- Cloudflare Tunnel とオリジンの長寿命接続数という観点では、問題の形が変わるだけになりやすい。
- Next.js の Route Handler で長寿命ストリームを安定運用する設計・監視が追加で必要になる。

### Option 3: Next.js Route Handlerを介したショートポーリングへ移行する

Pros:

- ブラウザが長寿命コネクションを保持しない。
- Cloudflare の通常HTTPキャッシュ、ETag、短い `s-maxage`、ジッター付きポーリングで負荷を平準化できる。
- Supabase Realtime の同時接続上限から公開画面を切り離せる。
- 既存の Server Actions と Supabase テーブルを維持し、購読フックだけを段階的に置き換えられる。
- 会場スクリーンのスタンプだけ高頻度カーソルポーリングに分離でき、一般参加者全員に高頻度リクエストを発生させずに済む。

Cons:

- Push ではないため、更新はポーリング間隔分だけ遅れる。
- WebSocket 接続の代わりにHTTPリクエスト数が増える。
- 304応答、ETag、ポーリング停止・再開、エラーバックオフなどのクライアント実装が必要になる。

### Option 4: Ably、Pusher、Cloudflare Durable Objectsなどの外部リアルタイム基盤へ移行する

Pros:

- 同時接続数やファンアウトを専用基盤へ逃がせる。
- Push 型のUXを維持できる。

Cons:

- 新しいサービス、料金、運用、権限管理、障害対応が増える。
- 多くの選択肢は結局クライアントとの長寿命接続を使う。
- 本アプリの更新頻度とデータ量に対して過剰で、当日までの実装リスクが高い。

## Decision

公開画面と管理画面のデータ更新は、Supabase Realtime のブラウザ直接購読をやめ、Next.js Route Handler 経由のショートポーリングに移行する。

ビンゴ番号とアンケート状態は1つの状態スナップショットAPIで取得する。景品画面は景品とアンケート状態をまとめたAPIを使う。会場スクリーンはビンゴ番号と最新リーチ数をまとめたAPIを使う。リアクションスタンプだけは、スクリーン画面専用に `stamp_triggers.id` をカーソルとして `id > lastSeenId` を短周期で取得する。

各ポーリングAPIは ETag を返し、クライアントは `If-None-Match` を送る。内容が変わっていない場合は 304 を返してJSONパースとReact状態更新を避ける。通常の公開状態APIは `Cache-Control: public, max-age=0, s-maxage=1, stale-while-revalidate=4` を基本にし、スタンプAPIは取りこぼしを避けるため `Cache-Control: no-store` にする。

Server Actions は更新後に Next.js のキャッシュタグを即時失効する。Next.js 16 の `cacheComponents` が有効なため、ビンゴ番号、アンケート状態、最新リーチ数のような高鮮度データは `updateTag` を優先し、`revalidateTag(..., "max")` の stale-while-revalidate による1回分の古い応答を避ける。

## Rationale

今回の制約は「リアルタイム基盤の種類」ではなく「公開ユーザー数に比例する長寿命コネクション」で顕在化している。そのため、WebSocket を1ユーザー1本に集約するだけでは余裕を作れるが、500ユーザー要件に対する根本対策にはならない。SSE やロングポーリングも接続を保持するため、同じ制約を別の形で受けやすい。

一方、ショートポーリングは各リクエストが短時間で完了する。500ユーザーが2秒間隔でアクセスしても、同時に保持される接続数は WebSocket より大幅に小さくなる。データ量も小さく、番号は最大99件、景品は現状31件程度、アプリ状態は1行、最新リーチは1行である。Cloudflare と Next.js のHTTPキャッシュ、ETag、ジッター、可視状態に応じた間隔調整を組み合わせれば、体感遅延と負荷のバランスを取りやすい。

スタンプは一般参加者全員が受信する必要はなく、会場スクリーンだけが受信すればよい。したがって、全ユーザーに高頻度ポーリングを持たせず、スクリーン専用のカーソルAPIに分離するのが最も負荷対効果が高い。

## Consequences

### Positive

- 公開ユーザーが Supabase Realtime の同時接続上限を消費しなくなる。
- Cloudflare Tunnel 上で長寿命 WebSocket が大量に積み上がる構成を避けられる。
- API単位で `s-maxage`、ETag、ログ、負荷試験を設計できる。
- 既存DB schemaとServer Actionsをおおむね維持できる。

### Negative

- 更新反映はポーリング間隔に依存し、完全な即時反映ではなくなる。
- HTTPリクエスト数は増えるため、APIレスポンスの軽量化とキャッシュ設計が必要になる。
- クライアント側にポーリング、ジッター、バックオフ、可視状態制御、304処理を実装する必要がある。

### Neutral / Trade-offs

- Supabase Realtime の publication 設定は移行直後には残してよい。安定確認後に別マイグレーションで削除するとロールバックしやすい。
- 管理画面は利用者数が少ないが、公開画面と同じHTTPポーリングに寄せることで実装の二重化を避ける。
- 景品情報は番号より更新頻度が低いため、ポーリング間隔を長めにしても運用影響は小さい。

## Implementation Notes

- `src/lib/realtime.ts` は新規の `src/lib/polling.ts` に置き換える。互換期間を設ける場合でも、公開画面の import は `@/lib/polling` に移す。
- 新規 Route Handler は `src/app/api/bingo/state/route.ts`、`src/app/api/bingo/prizes/route.ts`、`src/app/api/bingo/screen/route.ts`、`src/app/api/bingo/stamps/route.ts` に作る。
- Route Handler は Next.js 16 Cache Components と互換にするため `export const dynamic = "force-dynamic"` を宣言しない。DB取得は `src/lib/queries.ts` の `use cache` 付き関数、または同等のサーバー専用ヘルパーに閉じ込める。ビルド成果物で `/api/bingo/*` がDynamic Routeとして出力されることを確認する。
- `src/components/user/Layout/Layout.tsx` は内部で `useAppState` を呼ばず、親ページから最新の `appState` を受け取る。ホーム画面と景品画面はそれぞれページ単位のポーリングフックで必要データをまとめて取得する。
- 会場スクリーンは初期表示時に最新の `stamp_triggers.id` を受け取り、以後 `after` カーソルで新規スタンプだけを取得する。古いスタンプをリプレイしない。
- `src/features/admin/dashboard/actions.ts` の番号更新系は変更後の行を返すようにし、管理画面はローカル状態を即時更新できるようにする。
- `src/components/admin/server-actions.ts` と `src/features/user/actions/bingo-public.ts` のキャッシュ失効は、可能なら `updateTag` に寄せる。ビルド時に Next.js の互換性問題が出た場合のみ `revalidateTag(tag, "max")` と短い `cacheLife` の組み合わせに戻す。
- 本番反映直後は Supabase Realtime publication を削除しない。公開画面で WebSocket が消え、ポーリングが安定したことを確認してから、別ADRまたは別マイグレーションで削除を判断する。

## Validation

- [ ] `pnpm fmt`
- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] ホーム画面で管理者が番号を追加してから2.5秒以内に参加者画面へ反映されること
- [ ] アンケート配信ON/OFFが2.5秒以内に参加者画面へ反映されること
- [ ] 景品の当選状態が5秒以内に景品画面へ反映されること
- [ ] 会場スクリーンのリーチ数が2秒以内に反映されること
- [ ] リアクションスタンプが送信から1秒以内に会場スクリーンへ表示されること
- [ ] ブラウザDevToolsで公開画面から `/supabase/realtime/v1/websocket` への WebSocket 接続が発生しないこと
- [ ] 500クライアント相当のポーリング負荷試験で、WebSocket関連エラーが発生せず、主要APIの p95 レイテンシが運用許容範囲に収まること

## Related

- Issue:
- PR:
- RFC:
- Related ADR:
- Supersedes:
- Superseded by:
- 実装計画: `docs/exec-plans/2026-05-19-replace-realtime-websocket-with-short-polling.md`
- Cloudflare Tunnel Routing: https://developers.cloudflare.com/tunnel/routing/
- Cloudflare Connection Limits: https://developers.cloudflare.com/fundamentals/reference/connection-limits/
- Supabase Realtime Limits: https://supabase.com/docs/guides/realtime/limits
- Next.js Caching: https://nextjs.org/docs/app/getting-started/caching
