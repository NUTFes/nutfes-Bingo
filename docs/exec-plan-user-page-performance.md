# ExecPlan: ユーザーページの初期表示パフォーマンス改善

## 目的

公開済み本番環境 `https://bingo.nutfes.net` のユーザーページ `/` と `/prizes` について、モバイル環境で Lighthouse Performance が低下している原因を解消する。

今回の調査では重大な性能劣化は確認されていないが、モバイル Lighthouse で `/` は 97–98、`/prizes` は 95–97 となり、主に Largest Contentful Paint (LCP) がスコアを押し下げている。特に `/prizes` は、静的 HTML に景品データが含まれず、React hydration 後に state API を取得し、その後に LCP 画像を発見して取得する直列ウォーターフォールが存在する。

本計画では、現在の「Next.js static export + same-origin Cloudflare Worker API + WebSocket」というアーキテクチャ境界を維持したまま、まず `/prizes` の LCP 画像優先度だけを最小変更で改善する。再計測で必須基準を満たさない場合に限り、ブラウザ/React 標準の resource hint で初期 state request を前倒しする。専用 bootstrap state や Loading 中の Layout 先行 mount は追加しない。

## 対象範囲

対象ページ:

- `https://bingo.nutfes.net/`
- `https://bingo.nutfes.net/prizes`

主な対象コード:

- `src/components/user/cards/PrizeCardList/PrizeCardList.tsx`
- `src/components/user/cards/PrizeCard/PrizeCard.tsx`
- 必要に応じて `src/features/user/prizes/prizes-page.tsx`
- 必要に応じて `src/features/user/home/home-page.tsx`

Worker 側では既存の以下の API を利用する。API 契約変更が不要であれば Worker 実装自体は変更しない。

- `/api/bingo/state`
- `/api/bingo/socket`

`/api/bingo/prizes` は比較対象としては残すが、本計画では初期取得先へ切り替えない。

## 非対象

- 管理者ページ `/admin/*`
- 会場画面 `/screen`
- Durable Object の状態管理方式そのものの変更
- WebSocket を別方式へ置き換えること
- Next.js の `output: "export"` を廃止すること
- React / Next.js のフレームワークランタイムを独自実装へ置き換えること
- UI デザインの大幅な変更

## 現状の本番計測結果

計測日: 2026-08-28

計測対象はローカルビルドではなく、公開済み本番 URL である。

使用した主な計測環境:

- Lighthouse 13.4.1
- Chrome for Testing 151.0.7922.34
- Lighthouse mobile preset
- Lighthouse desktop preset
- 本番: `https://bingo.nutfes.net`

Google PageSpeed Insights API も試行したが、共有 API クォータの当日上限に達しており、新規 PSI 計測は取得できなかった。そのため本計画のベースラインは Lighthouse の lab data とする。CrUX / field data ではない。

### モバイル Lighthouse

各ページを 3 回計測した。

#### `/`

| Run | Performance |     FCP |     LCP |   TBT | CLS | Speed Index |
| --- | ----------: | ------: | ------: | ----: | --: | ----------: |
| 1   |          97 | 1.571 s | 2.441 s | 16 ms |   0 |     1.626 s |
| 2   |          97 | 1.558 s | 2.428 s | 15 ms |   0 |     1.716 s |
| 3   |          98 | 1.569 s | 2.364 s |  8 ms |   0 |     1.710 s |

中央値:

- Performance: 97
- FCP: 約 1.57 s
- LCP: 約 2.43 s
- TBT: 約 15 ms
- CLS: 0

#### `/prizes`

| Run | Performance |     FCP |     LCP |   TBT | CLS | Speed Index |
| --- | ----------: | ------: | ------: | ----: | --: | ----------: |
| 1   |          96 | 1.561 s | 2.581 s | 82 ms |   0 |     1.561 s |
| 2   |          95 | 1.562 s | 2.807 s | 43 ms |   0 |     1.562 s |
| 3   |          97 | 1.564 s | 2.584 s | 43 ms |   0 |     1.564 s |

中央値:

- Performance: 96
- FCP: 約 1.56 s
- LCP: 約 2.58 s
- TBT: 約 43 ms
- CLS: 0

`/prizes` は計測揺らぎの範囲でも `/` より LCP が悪く、2.5 秒を超えるケースが安定して発生している。

### デスクトップ Lighthouse

| ページ    | Performance |     FCP |     LCP |  TBT | CLS | Speed Index |
| --------- | ----------: | ------: | ------: | ---: | --: | ----------: |
| `/`       |         100 | 0.452 s | 0.542 s | 0 ms |   0 |     0.581 s |
| `/prizes` |         100 | 0.459 s | 0.549 s | 0 ms |   0 |     0.466 s |

デスクトップでは問題は再現せず、改善対象は主にネットワーク・CPU 制約が強いモバイル条件である。

## 詳細分析

### 1. 初期 HTML は実コンテンツではなく Loading のみ

`src/app/(user)/page.tsx` は以下の空状態から開始する。

- `initialNumbers={[]}`
- `initialAppState={EMPTY_APP_STATE}`

`src/app/(user)/prizes/page.tsx` も以下の空状態から開始する。

- `initialPrizes={[]}`
- `initialAppState={EMPTY_APP_STATE}`

`HomePage` と `PrizesPage` は `appState.event_id !== ""` になるまで `isReady === false` となり、次のようにページ全体を Loading に置き換えている。

```tsx
if (!isReady) {
  return <Loading />;
}
```

本番 HTML でも `/` と `/prizes` の両方で `Loading` コンポーネントと「読み込み中…」が初期コンテンツとして出力されていることを確認した。

そのため、Header、Navigation、番号一覧、景品一覧は hydration と state API 完了後まで DOM に存在しない。

### 2. state API が hydration 後の `useEffect` まで開始されない

`src/lib/realtime.ts` の `useBingoState()` は `useEffect()` 内で初回 `requestSnapshot()` を実行する。

現状の初期表示経路は以下になる。

```text
HTML download / parse
  -> Next.js / React JavaScript download
  -> hydration / client initialization
  -> useEffect
  -> fetch("/api/bingo/state")
  -> JSON parse / state update
  -> Layout and page content render
```

API 自体が極端に遅いのではなく、API リクエスト開始位置が遅いことが主な問題である。

### 3. `/` の LCP は Header だが、Header まで API 待ちになっている

詳細トレースの一例では `/` の時系列は以下だった。

| イベント                | Navigation start からの実測時刻 |
| ----------------------- | ------------------------------: |
| Document 完了           |                       約 114 ms |
| DOMContentLoaded        |                       約 271 ms |
| `/api/bingo/state` 開始 |                       約 316 ms |
| `/api/bingo/state` 完了 |                       約 408 ms |
| observed LCP            |                       約 450 ms |

この observed timing は Lighthouse がシミュレーションして表示する 2.x 秒の LCP 値とは尺度が異なる。原因分析のための実トレース上の相対時系列として扱う。

LCP 要素は Header の `nutfes-Bingo` ボタンだった。

Lighthouse の LCP breakdown では、代表計測で以下を確認した。

- Time to First Byte: 約 113 ms
- Element render delay: 約 337 ms

Header 自体は state の内容がなくても表示可能だが、現在は `isReady` gate のため API 完了後にしか描画されない。`/` ではこの構造が LCP 遅延の主要因である。

### 4. `/prizes` は API 完了後に初めて LCP 画像を発見する

詳細トレースの一例では `/prizes` の時系列は以下だった。

| イベント                | Navigation start からの実測時刻 |
| ----------------------- | ------------------------------: |
| Document 完了           |                        約 98 ms |
| DOMContentLoaded        |                       約 175 ms |
| `/api/bingo/state` 開始 |                       約 272 ms |
| `/api/bingo/state` 完了 |                       約 317 ms |
| 景品画像リクエスト開始  |                       約 373 ms |
| LCP 画像取得完了        |                       約 430 ms |
| observed LCP            |                       約 451 ms |

LCP 要素は先頭景品「Alexa」の画像だった。

現状は次の直列依存になる。

```text
hydration
  -> state API
  -> state update
  -> PrizeCard render
  -> image URL discovery
  -> image fetch
  -> LCP
```

画像そのものの取得時間より、画像 URL が DOM に現れるまでの待ちが大きい。

### 5. `/prizes` の LCP 画像が lazy load になっている

`src/components/user/cards/PrizeCard/PrizeCard.tsx` の `next/image` は loading / fetch priority を指定していないため、LCP 画像にも次の属性が付く。

```html
<img alt="Alexa" loading="lazy" decoding="async" ... />
```

Lighthouse の `LCP request discovery` は次の 3 項目をすべて満たしていないと判定した。

- `fetchpriority=high` が指定されていない
- request が initial document から discoverable ではない
- LCP resource が lazy load になっている

景品画像 URL 自体が state API 完了後まで分からないため、`loading="eager"` / `fetchPriority="high"` だけでは discovery の直列依存自体は解消しない。ただし変更量が小さく、必須基準を満たすだけの改善が得られる可能性があるため、まず単独で適用・再計測する。

### 6. `/prizes` が既存の専用 API を利用していない

Worker には既に `/api/bingo/prizes` が実装されており、以下のみを返す。

- revision
- prizes
- appState
- serverTime

しかし `usePrizesRealtimeState()` も初期取得には `/api/bingo/state` を利用している。

本番での 3 回計測:

| API                 |          TTFB | raw body size |
| ------------------- | ------------: | ------------: |
| `/api/bingo/state`  | 約 129–146 ms |      12,110 B |
| `/api/bingo/prizes` | 約 112–118 ms |      11,585 B |

現在のデータ量では約 0.5 KB 差しかなく、専用 API 化だけで LCP が大幅改善するとは考えにくい。

抽選番号の増加に伴って差が拡大する可能性はあるが、現時点の性能目的に対する効果が小さいため、本計画では `/api/bingo/prizes` への切替を行わない。将来 payload 差が有意になった場合に独立して再評価する。

### 7. Unused JavaScript 約 51 KiB は第一原因ではない

Lighthouse は両ページで `Reduce unused JavaScript` 約 51 KiB を報告した。

主な対象:

- `_next/static/chunks/1oeewysgs7195.js`: unused 約 27 KiB
- `_next/static/chunks/01hi3m6et5p7d.js`: unused 約 25 KiB

調査したところ、これらには React DOM、hydration、Next Router などのフレームワーク共通ランタイムが含まれる。

代表計測の main-thread work は以下だった。

`/`:

- Script Evaluation: 約 201 ms
- Style & Layout: 約 214 ms
- TBT: 約 15 ms

`/prizes`:

- Script Evaluation: 約 258 ms
- Style & Layout: 約 324 ms
- TBT: 約 40–70 ms

TBT は十分小さく、LCP の直列依存ほど強いボトルネックではない。Lighthouse の 51 KiB をそのままアプリ固有コードとして削除できるわけでもないため、本計画では第一優先にしない。

### 8. 画像圧縮には改善余地があるが二次要因

Cloudflare Image Transformations は現在以下を指定している。

- width
- prize image の場合 height
- `fit=scale-down`
- `format=auto`
- `onerror=redirect`

`quality` は未指定。

代表画像で `quality=75` を指定した場合:

| 画像           |     現状 | quality=75 | 削減率概算 |
| -------------- | -------: | ---------: | ---------: |
| Alexa          |  4,853 B |    3,948 B |     約 19% |
| 手持ち花火     | 10,820 B |    8,663 B |     約 20% |
| グミ作成キット |  9,022 B |    7,242 B |     約 20% |

Lighthouse の `Improve image delivery` では代表計測で約 10 KiB の推定削減余地が出た。

一方、LCP 画像自体は数 KB であり、主要因は画像圧縮より画像 discovery の遅さである。品質変更は LCP 経路改善後の P2 とする。

### 9. Render-blocking CSS は存在するが影響は限定的

代表計測では、約 5.9 KiB、0.8 KiB、0.9 KiB の CSS が render-blocking request として検出された。

一方で Document latency は良好で、代表値では本番 root document の server response は約 36–40 ms と判定された。CLS は両ページとも 0 である。

CSS 最適化は本計画の初期マイルストーンには含めず、P0/P1 改善後も Lighthouse が明確なボトルネックとして残る場合に再評価する。

## 原因の優先順位

1. **P0: `/prizes` の LCP 画像が state API 後に初めて発見され、さらに lazy load になっている**
2. **P0: 初期 state fetch が hydration 後まで開始されない**
3. **P1: `isReady` まで Layout / Header ごと Loading に置き換えている**
4. **P2: 景品画像の転送量に削減余地がある**
5. **P3: React / Next.js 共通 JS と render-blocking CSS**

`/api/bingo/prizes` 未使用は現状の payload 差が小さく、今回の主要原因とは扱わない。

## 実装方針

### Milestone 1: `/prizes` の先頭画像だけ eager / high priority にする

目的:

- 最小のコード変更で、state API 完了後から LCP image fetch 開始までの待ちを削減する。
- 初期 state 管理や API 契約には触れない。

実装案:

1. `PrizeCardList` で先頭要素だけを判定し、`PrizeCard` へ `highPriority` のような boolean を渡す。
2. `highPriority` の画像だけ `loading="eager"` と `fetchPriority="high"` を指定する。
3. それ以外の画像は現在どおり native lazy loading に任せる。
4. Next.js 16 では `priority` prop が非推奨のため使用しない。

表示 index 自体を `PrizeCard` へ渡さず、優先度を付けるかどうかだけを渡す。カード側に一覧上の位置という不要な責務を持たせない。

完了条件:

- Lighthouse `LCP request discovery` の `eagerlyLoaded` と `priorityHinted` が改善する。
- 先頭以外の景品画像を不必要に eager/high priority にしない。
- `/prizes` の mobile LCP 中央値が 2.5 秒未満なら、Milestone 2 は実施しない。

### Milestone 2: 必要な場合だけ `/prizes` の state resource hint を追加する

Milestone 1 後も `/prizes` の mobile LCP 中央値が 2.5 秒以上で、trace 上で state request start の遅さが支配的な場合だけ実施する。

目的:

- hydration 後まで遅れている `/api/bingo/state` の request start を initial document parse 中へ前倒しする。
- `window` global、bootstrap Promise、専用 state path を追加せず、既存 `fetchState()` / ETag / revision ordering / WebSocket recovery をそのまま維持する。

実装案:

1. 既に Client Component である `PrizesPage` の render 中に React DOM の `preload("/api/bingo/state", { as: "fetch", crossOrigin: "anonymous" })` を呼び、SSR された initial HTML の resource hint として出力する。
2. 実データの取得・normalize・ETag 検証・state apply は変更せず、既存 `fetchState()` だけを利用する。
3. inline bootstrap script、`window` property、global declaration、bootstrap 専用 fallback は追加しない。
4. preload と通常 fetch の request 条件が合わず二重 request になる場合は、この変更を採用しない。既存の `Accept` 指定が再利用を妨げることが trace で確認できた場合に限り、Worker が要求していない冗長な `Accept` 指定の削除を検討する。

`/api/bingo/prizes` への切替は行わない。現状は `/api/bingo/state` との差が約 0.5 KB しかなく、URL 分岐・normalizer・contract test を増やす効果に見合わないためである。

完了条件:

- `/prizes` の state request が hydration 完了後ではなく initial document parse 中に開始する。
- Network trace 上、同一 navigation で `/api/bingo/state` の不要な二重転送が発生しない。
- state apply / retry / WebSocket のコードを変更せず、既存挙動を維持する。

### Milestone 3: 必要な場合だけ `/` に同じ state resource hint を追加する

Milestone 1/2 の再計測後、`/` が必須基準を満たさず、trace 上で state request start の遅さが Header LCP に寄与している場合だけ実施する。

目的:

- `HomePage` の `isReady` gate と Loading UX を維持したまま、Header が描画可能になる state 到着を早める。
- 空 `appState` で `<Layout>` を mount して preference / survey / interaction の副作用を先行実行しない。

実装案:

1. `HomePage` の render 中にも Milestone 2 と同じ `preload("/api/bingo/state", { as: "fetch", crossOrigin: "anonymous" })` を追加する。
2. `if (!isReady) return <Loading />`、`Layout`、Navigation、各 interaction hook は変更しない。
3. 2 箇所だけの利用のために shared preload helper は作らない。
4. `/prizes` と同様、二重 request が発生する場合は resource hint を採用しない。

完了条件:

- `/` の state request start が hydration 後から initial document parse 中へ移る。
- Network trace 上、不要な state API の二重転送が発生しない。
- Loading 中の preference / survey / reaction / reach の挙動を変更しない。
- `/` の mobile LCP を現状から悪化させない。

### 今回実施しない最適化

以下は今回の必須性能目標に対する寄与が小さいため、実装対象から外す。

- `/api/bingo/prizes` への初期取得切替
- prizes 専用 normalizer
- Cloudflare Image Transformations の `quality` 調整
- React / Next.js 共通 runtime の削減
- render-blocking CSS の再設計

画像 quality は Milestone 1–3 後にも `Improve image delivery` が有意な課題として残った場合に、別の小さな変更として再評価する。

## 検証計画

### 静的検証

frontend 変更として、各 Milestone で最低限以下を実施する。

```text
pnpm fmt:check
pnpm lint
pnpm typecheck
pnpm test
pnpm doctor
```

Worker、Next.js config、routing、dependency resolution は本計画では変更しない。実装中にそれらへ変更が広がった場合だけ `mise run cloudflare:check` を追加する。

依存関係の追加・削除は行わない。実装中に dependency / export / entry point の変更が必要になった場合だけ `pnpm knip` を追加する。

### ユニット / Worker テスト

Milestone 1 は画像属性の限定的な変更なので、新しいテスト基盤や component test は追加しない。既存の静的検証と Lighthouse で確認する。

Milestone 2/3 は resource hint の追加だけなので、bootstrap 専用ユニットテストは追加しない。revision ordering と ETag の正しさは既存 `test/client-state.test.ts` をそのまま利用する。

resource hint が実際に既存 fetch に利用されるかはブラウザ挙動を含むため、Network trace で request start と `/api/bingo/state` の request 数を確認する。テストのためだけの abstraction は作らない。

### ローカル確認

Cloudflare development runtime は AGENTS.md に従い Docker 経由とする。

```text
mise run cloudflare:dev
```

確認項目:

- `/`
- `/prizes`
- state API failure 時の Loading / retry
- WebSocket 接続・更新
- offline -> online recovery
- dark mode / language / sort preferences
- reach / reaction / survey UI

### 本番 Lighthouse 再計測

最終評価は公開済み本番環境への deploy 後に実施する。

対象:

- `https://bingo.nutfes.net/`
- `https://bingo.nutfes.net/prizes`

条件:

- Lighthouse mobile preset
- 各ページ最低 5 回
- Performance / FCP / LCP / TBT / CLS / Speed Index を保存
- 単発の最高値ではなく中央値を比較
- LCP element と LCP request discovery を確認
- Network request start を trace で確認
- desktop も最低 1 回実施し regression がないことを確認

必要であれば PageSpeed Insights の API quota 回復後に field data / CrUX の有無も確認する。ただし初回リリース判定を PSI quota に依存させない。

## 成功基準

### 必須

- `/` と `/prizes` の mobile Lighthouse Performance が既存中央値を下回らない。
- `/prizes` の mobile LCP 中央値を **2.5 秒未満**にする。
- `/` の mobile LCP を 2.5 秒未満で安定させ、現状約 2.43 秒から悪化させない。
- CLS **0** を維持する。少なくとも Lighthouse 上 0.1 を超える regression は不可。
- TBT を `/` 100 ms 未満、`/prizes` 100 ms 未満に維持する。
- state API / WebSocket の revision ordering を壊さない。
- 通信失敗時の fallback / retry を壊さない。

### 目標

- `/prizes` mobile Performance の 5 回中央値を **98 以上**へ改善する。
- `/prizes` の LCP image request start を state API 完了後のできるだけ早い時点へ移す。
- Milestone 2 が必要になった場合は、`/prizes` の state request start を initial document parse 中へ移す。
- Milestone 3 が必要になった場合は、`/` の state request start も initial document parse 中へ移し、Header の待ち時間を短縮する。

数値目標は lab data の揺らぎを考慮し、1 回のスコアではなく複数回の中央値で判断する。目標値のためだけに、必須基準を既に満たしているページへ追加実装は行わない。

## 変更リスクと対策

### state preload が通常 fetch に再利用されない

リスク:

- preload と通常 fetch の credentials / request 条件、または `/api/bingo/state` の `Cache-Control: no-cache` の扱いによっては、preload 後に通常 fetch が別 request となり転送が増える可能性がある。

対策:

- `as="fetch"` と `crossOrigin="anonymous"` を指定し、通常の same-origin fetch と条件を合わせる。
- Network trace で同一 navigation の state API request 数を確認する。
- 二重転送になる場合は preload を採用せず、今回の計画内で bootstrap/cache layer を追加して埋め合わせない。

### state preload の対象拡大

リスク:

- 共通 layout に resource hint を置くと、性能改善が不要な public page でも state request が発生する。

対策:

- Milestone 2 は `PrizesPage`、Milestone 3 は必要な場合だけ `HomePage` に直接追加する。
- root layout / user layout、pathname 分岐、shared preload manager は追加しない。

### high-priority image の過剰指定

リスク:

- 複数画像を eager/high priority にすると、JavaScript、CSS、LCP 候補画像の bandwidth が競合する。

対策:

- 最初は先頭 1 枚のみ指定する。
- Lighthouse の LCP 候補と network priority を見て必要な場合のみ拡張する。

## ロールバック方針

各 Milestone を可能な限り独立した commit / PR 単位にする。

優先する分割:

1. Prizes LCP image priority
2. 必要な場合のみ Prizes state preload
3. 必要な場合のみ Home state preload

本番で regression が出た場合は、Cloudflare Worker version rollback を用いるか、該当 commit を revert する。

Durable Object schema / persisted state は本計画では変更しないため、パフォーマンス改善のロールバックに PITR は不要である。

## 実施順序

1. Milestone 1 の先頭景品画像 priority だけを実装する。
2. 静的解析・テストを通す。
3. deploy 後、本番 Lighthouse を `/prizes` 5 回、`/` も regression check として 5 回実行する。
4. `/prizes` が必須 LCP 基準を満たせば Milestone 2 を実施しない。
5. `/prizes` が基準未達で state request start が主要因なら、Milestone 2 の `/prizes` 限定 state preload を実装する。
6. Milestone 2 を実施した場合は Network trace で二重 request がないことを確認してから、本番 Lighthouse を再計測する。二重転送になる場合は Milestone 2 を revert する。
7. `/` が必須基準未達で state request start の遅さが Header LCP に寄与しているなら、Milestone 3 の同じ preload を `HomePage` に追加する。
8. Milestone 3 を実施した場合も request 数と Lighthouse を再確認する。
9. 最終計測値と、不要だったため見送った Milestone を本 ExecPlan の「実施結果」に追記する。

## 判断ポイント

### Milestone 1 後に Milestone 2 を実施する条件

以下をすべて満たす場合に実施する。

- `/prizes` の mobile LCP 5 回中央値が 2.5 秒以上である。
- trace 上で `/api/bingo/state` の request start が hydration 後まで遅れていることが残存ボトルネックとして確認できる。

必須基準を満たしていれば、より高い Lighthouse score のためだけに resource hint を追加しない。

### Milestone 3 を実施する条件

以下のいずれかを満たし、state request start の遅さが Header LCP に寄与している場合に実施する。

- `/` の mobile LCP 5 回中央値が 2.5 秒以上になる。
- `/` の mobile Performance が既存中央値を明確に下回る。
- LCP breakdown と trace で Header の待ち時間のうち hydration 後の state request start が有意に残る。

`/` が必須基準を満たしている場合、目標値 98 のためだけに resource hint を追加しない。

### 画像 quality の扱い

Milestone 1–3 後にも `Improve image delivery` が有意な課題として残る場合だけ、別 ExecPlan または独立変更で再評価する。今回の実装には含めない。

## 過去実装との関係

Git 履歴上、現在の「静的 HTML は空 state、client `useEffect` で state API、`isReady` までページ全体 Loading」という構成は 2026-08-23 の Cloudflare-native/static export 移行コミット `e468b38` で導入されている。

移行前の旧ユーザーページでは、データ loading 中も `<Layout>` 自体を描画し、その上に `<Loading />` を重ねる構成だった。

過去の Lighthouse 計測値が残っていないため、「このコミットで Performance が何点低下した」とは断定しない。しかし、現在確認している `/` の Header LCP が API 完了まで生成されない経路は、現在の `isReady` gate と一致している。

## Progress

- [x] 本番 `/` と `/prizes` の Lighthouse mobile 計測
- [x] 本番 `/` と `/prizes` の Lighthouse desktop 計測
- [x] LCP 要素の特定
- [x] state API request timing の trace 確認
- [x] `/api/bingo/state` と `/api/bingo/prizes` の本番応答比較
- [x] unused JavaScript の内容確認
- [x] Cloudflare image transformation の quality 比較
- [x] Git 履歴から現在の初期描画構成の導入時点を確認
- [x] Milestone 1: 先頭景品画像の eager / high priority 実装
- [x] Milestone 1 後の本番 Lighthouse 5 回計測
- [x] Milestone 2: `/prizes` state preload 実装
- [x] Milestone 2 後の request 数 / timing 確認と本番 Lighthouse 5 回計測
- [x] Milestone 3: `/` が実施条件を満たさないため見送り
- [x] 最終本番計測と結果記録

## 実施結果

### 変更と deploy

- Milestone 1 commit: `9e4bfea` (`perf: prioritize first prize image`)
- Milestone 2 commit: `122eb48` (`perf: preload prize state request`)
- Milestone 1 production version: `79d8c5c6-7798-4512-8043-f31769795175`
- Milestone 2 production version: `a5787af7-f507-4ae7-b9f9-f37b47b2b301`
- 最終計測時 RELEASE_SHA: `122eb487157a80e77ad0afb3a5b60089e4f26f46`
- 各 deploy 後に production smoke test を実行し、public static page、singleton readiness、HTTP state fallback、prize image、Access boundary、public WebSocket を確認した。

### Milestone 1 後の判定

`/prizes` の mobile Lighthouse 5 回は以下だった。

| Run | Performance |     FCP |     LCP |    TBT | CLS | Speed Index |
| --- | ----------: | ------: | ------: | -----: | --: | ----------: |
| 1   |          95 | 1.566 s | 2.511 s | 139 ms |   0 |     2.209 s |
| 2   |          96 | 1.564 s | 2.659 s |  77 ms |   0 |     1.564 s |
| 3   |          96 | 1.540 s | 2.635 s |  74 ms |   0 |     2.210 s |
| 4   |          96 | 1.561 s | 2.656 s |  68 ms |   0 |     1.561 s |
| 5   |          96 | 1.555 s | 2.500 s |  74 ms |   0 |     1.555 s |

中央値:

- Performance: 96
- FCP: 約 1.56 s
- LCP: 約 2.64 s
- TBT: 74 ms
- CLS: 0

先頭画像は `loading="eager"` / `fetchpriority="high"` になり、Lighthouse `LCP request discovery` の `eagerlyLoaded` と `priorityHinted` は `true` へ改善した。一方、`requestDiscoverable` は `false` のままだった。

LCP 中央値が 2.5 秒以上であり、代表 run では `/api/bingo/state` が約 954 ms に開始し、Alexa 画像が約 1043 ms に開始していたため、Milestone 2 の実施条件を満たすと判断した。

### Milestone 2 後の最終 mobile Lighthouse

#### `/`

| Run | Performance |     FCP |     LCP |   TBT | CLS | Speed Index |
| --- | ----------: | ------: | ------: | ----: | --: | ----------: |
| 1   |          98 | 1.554 s | 2.349 s | 25 ms |   0 |     1.603 s |
| 2   |          97 | 1.554 s | 2.424 s | 40 ms |   0 |     1.574 s |
| 3   |          97 | 1.556 s | 2.426 s | 45 ms |   0 |     1.619 s |
| 4   |          97 | 1.559 s | 2.429 s | 30 ms |   0 |     1.595 s |
| 5   |          98 | 1.553 s | 2.348 s | 14 ms |   0 |     1.558 s |

中央値:

- Performance: 97
- FCP: 約 1.55 s
- LCP: 約 2.42 s
- TBT: 30 ms
- CLS: 0

既存中央値 Performance 97 / LCP 約 2.43 s を悪化させておらず、LCP 2.5 秒未満も維持した。このため Milestone 3 の実施条件には該当しない。

#### `/prizes`

| Run | Performance |     FCP |     LCP |    TBT | CLS | Speed Index |
| --- | ----------: | ------: | ------: | -----: | --: | ----------: |
| 1   |          96 | 1.583 s | 2.678 s |  82 ms |   0 |     1.859 s |
| 2   |          95 | 1.563 s | 2.658 s | 124 ms |   0 |     1.563 s |
| 3   |          96 | 1.554 s | 2.574 s |  88 ms |   0 |     1.554 s |
| 4   |          96 | 1.564 s | 2.659 s |  68 ms |   0 |     1.564 s |
| 5   |          97 | 1.562 s | 2.507 s |  61 ms |   0 |     1.562 s |

中央値:

- Performance: 96
- FCP: 約 1.56 s
- LCP: 約 2.66 s
- TBT: 82 ms
- CLS: 0

Performance 中央値は既存の 96 を維持し、CLS も 0 を維持した。TBT 中央値は 100 ms 未満だが、1 run で 124 ms が発生した。LCP 中央値は 2.5 秒未満の必須基準に到達していない。

### state request / LCP image timing

同じ Lighthouse 13.4.1 / Chrome for Testing 151.0.7922.34 の代表 run を比較すると、Milestone 2 前後で以下の変化を確認した。

| Event                            | Milestone 1 | Milestone 2 |
| -------------------------------- | ----------: | ----------: |
| `/api/bingo/state` request start |   約 954 ms |   約 120 ms |
| `/api/bingo/state` request end   |   約 994 ms |   約 159 ms |
| Alexa image request start        |  約 1043 ms |   約 366 ms |
| Alexa image request end          |  約 1110 ms |   約 402 ms |

Milestone 2 後の5回すべてで `/api/bingo/state` は1 navigationにつき1 requestだけで、preloadと通常fetchによる二重転送は発生しなかった。state request start は initial document parse 中へ前倒しできた。

LCP element は変更前後とも先頭景品「Alexa」の画像だった。Milestone 1/2 後は `fetchpriority="high"` と `loading="eager"` が付与されている。画像URL自体は引き続きstate取得後のrenderで確定するため、Lighthouseの `requestDiscoverable` は `false` のままである。

### desktop regression check

| Page      | Performance |     FCP |     LCP |  TBT | CLS | Speed Index |
| --------- | ----------: | ------: | ------: | ---: | --: | ----------: |
| `/`       |         100 | 0.447 s | 0.517 s | 0 ms |   0 |     0.568 s |
| `/prizes` |         100 | 0.458 s | 0.548 s | 0 ms |   0 |     0.458 s |

desktop では regression を確認しなかった。

### 採用 / 見送り

- Milestone 1 は採用した。
- Milestone 2 は、state requestを約 954 ms から約 120 msへ前倒しし、二重requestも発生しなかったため採用した。
- Milestone 3 は `/` のLCP中央値が2.5秒未満でPerformanceも既存中央値を維持したため見送った。
- `/api/bingo/prizes` への切替、画像quality調整、Loading中のLayout先行mount、bootstrap stateは計画どおり実施していない。

### 残存課題

`/prizes` の mobile LCP 中央値は約 2.66 秒で、必須基準の 2.5 秒未満を満たしていない。state request とLCP画像requestの実時間上の開始は大きく前倒しできたため、残存するLighthouseのLCP値はhydration / render timing、lab simulationの揺らぎ、画像がinitial documentから直接discoverableではない構造などを含めて別途切り分ける必要がある。

今回のExecPlanで定義したMilestone 3は `/` 専用であり、`/prizes` の残存課題には対応しないため追加しなかった。次の変更を行う場合は、この計画の非対象としていたstable shell、初期データの静的埋め込み、画像delivery等を改めて比較し、別ExecPlanで扱う。

## Decision Log

### 2026-08-28: JS 削減を P0 にしない

Lighthouse の unused JavaScript 約 51 KiB は目立つが、対象は React / Next.js 共通ランタイムを多く含み、TBT も小さい。現在観測している LCP の直列 fetch / render dependency を先に解消する方が、原因に直接対応しているため。

### 2026-08-29: `/api/bingo/prizes` への切替を今回行わない

現データでは `/api/bingo/state` との差は raw body 約 0.5 KB であり、専用 endpoint へ切り替えるための URL 分岐、normalize 考慮、contract test の追加に対して性能効果が小さい。今回の必須目標には既存 `/api/bingo/state` をそのまま使う。

### 2026-08-28: static export を維持する

本プロジェクトのアーキテクチャ境界では public page は static export であり、dynamic state は same-origin Worker API を経由する。本計画はこの境界内で改善する。

### 2026-08-28: `priority` prop は使用しない

リポジトリが使用する Next.js 16.3.1 の同梱ドキュメントでは `priority` は deprecated で、`preload`、`loading="eager"`、`fetchPriority="high"` の利用が案内されている。今回の LCP 画像は初期 HTML 生成時には URL が分からないため、まず `loading="eager"` と `fetchPriority="high"` を適用する。

### 2026-08-29: 最小変更を先に計測する

最初から early bootstrap、専用 endpoint、stable shell、画像 quality をまとめて実装しない。先頭 LCP 画像の priority だけを変更して本番再計測し、必須基準に届かない原因が残った場合だけ次の Milestone を追加する。

### 2026-08-29: state request 前倒しは native resource hint を先に使う

初期 request start の前倒しには、inline script と `window` Promise を新設せず React DOM の `preload(..., { as: "fetch" })` を先に試す。resource hint は既存 fetch に再利用できる場合だけ採用し、`Cache-Control: no-cache` 等の影響で二重転送になる場合は revert する。今回の必須基準のためだけに専用 bootstrap/cache layer は追加しない。

### 2026-08-29: Milestone 2 の state preload を採用する

本番計測で `/api/bingo/state` は5回すべて1 navigationにつき1 requestで、二重転送は発生しなかった。代表 run の request start は約 954 ms から約 120 msへ、Alexa画像のrequest startは約 1043 msから約 366 msへ前倒しできたため、resource hint自体は意図どおり機能していると判断した。LCP中央値は2.5秒未満に到達していないが、Performance中央値は既存の96を維持しており、revert条件には該当しないため採用する。

### 2026-08-29: Milestone 3 は実施しない

Milestone 2 後の `/` は mobile Performance 5回中央値97、LCP中央値約2.42秒、CLS 0で、既存中央値を悪化させず必須基準を満たした。目標値のためだけに `/` へstate preloadを追加しないという計画に従い、Milestone 3は見送る。
