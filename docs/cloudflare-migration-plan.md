# Cloudflare 移行計画・実施記録

作成日: 2026-07-13  
対象ブランチ: `feat/yama/supabase-migration`  
基準コミット: `c839301`

## 1. 結論

公開画面と管理画面の見た目を維持し、Next.js は `output: "export"` で静的出力する。Cloudflare Worker は `/api/*`、`/admin*`、`/screen`、`/screen/*` を処理し、通常の公開 HTML、JavaScript、CSS、同梱画像は Workers Static Assets から Worker を起動せずに配信する。`/admin*`、`/screen`、`/screen/*`はHTML配信前にもWorkerでAccess JWTを再検証する。

動的な正本は次の3種類の Durable Object (DO) に分ける。

- `GameDirectory`: 現在有効な generation 名だけを強整合に保持する。
- `GameState`: generation ごとに抽選番号、景品 metadata、アンケート、リーチ数、公開リーチの重複防止、管理操作監査を SQLite に保持する。状態変更を Hibernation WebSocket で配信する。
- `ReactionHub`: stamp を永続状態から分離し、短期 rate limit、sampling、drop、会場画面への Hibernation WebSocket 配信だけを行う。

景品画像は専用 R2 bucket に immutable key で保存する。論理 snapshot は非公開の別 R2 bucket に保存し、新しい `GameState` generation へ restore・検証した後で `GameDirectory` の pointer を切り替える。

管理画面は Cloudflare Access で囲い、Worker でも `Cf-Access-Jwt-Assertion` の署名、issuer、audience、有効期限、許可 email を再検証する。Access を通過したことだけを管理権限とはみなさない。

### 実施状況（2026-07-13）

- production/staging Worker、application/media custom domain、環境別R2、Access、Turnstileを構築・deploy済み。
- Access loginと実Turnstile challengeをbrowserで確認済み。
- stagingで100 state WebSocketのready成功率100%、5xx 0を確認済み。
- 旧Supabaseは実運用されていなかったため、logical migrationは不要と判断した。productionは空の`initial` generationから開始する。
- rollback windowを必要とする旧データ/originが存在しないため、旧Supabase、PostgreSQL、Proxmox LXC、Cloudflared、Compose、移行CLIをrepositoryから削除した。
- rollbackはWorker version、Durable Object generation、private R2 snapshotへ一本化した。

### OpenNext を採用しない理由

OpenNext for Cloudflare は現行 Next.js 16.2.10、App Router、Route Handlers、Server Actions を維持しやすい。一方、厳格な Workers Free 運用では次が不利である。

- Free Worker は圧縮後 3 MiB までで、Next.js/OpenNext runtime を含む bundle が上限を超える危険がある。
- 動的 page、Server Action、Route Handler は Worker invocation になる。
- 現行 polling を残すと 1000人で最大約 500 req/s となり、100,000 requests/day を数分で使い切る。
- Next runtime を経由しない小型 API Worker の方が 10 ms CPU/invocation に余裕を持たせやすい。

Static Assets は asset hit が無料かつ無制限である。移行工数は増えるが、UI component は再利用し、server data boundary だけを client fetch/WebSocket に置換できるため、この案を採用する。

## 2. 現状調査

この節は基準コミット`c839301`の調査記録である。記載した旧ファイルの一部は実装完了後に削除されている。

### 2.1 Next.js と画面

- Next.js `16.2.10`、React `19.2.7` を使用している (`package.json`)。
- App Router のみを使用し、公開 route は `/`、`/prizes`、`/screen`、管理 route は `/admin`、`/admin/prizes`、`/admin/prizes/new`、`/admin/login` である (`src/app`)。
- `next.config.ts` は `output: "standalone"` と `cacheComponents: true` を指定している。
- 公開 page は `connection()` の後に Supabase の初期 query を行うため、静的 HTML だけでは完結しない (`src/app/(user)/page.tsx:13`、`src/app/(user)/prizes/page.tsx:13`、`src/app/(user)/screen/page.tsx:16`)。
- 管理 page も `requireAdmin()` と初期 query を server で行う。
- `proxy.ts` と `src/lib/supabase/proxy.ts` が `/admin/**` の Supabase session を更新・検査する。ただし proxy は admin role の正本ではない。
- mutation は Server Actions に集約されている (`src/features/admin/**/actions.ts`、`src/features/user/actions/bingo-public.ts`)。
- Next.js 16 の repository 同梱ガイドを確認した。static export は request-dependent Route Handler、cookie、headers、proxy、Server Actions をサポートしないため、これらは Worker/API へ移す必要がある (`node_modules/next/dist/docs/01-app/02-guides/static-exports.md`)。

### 2.2 Supabase の使用境界

ブラウザから Supabase Auth、PostgREST、Storage を直接呼ぶコードはない。現在も Next.js を BFF とする server-only 境界は守られている。

- `src/lib/supabase/admin.ts` は Data API と Storage 用の service-role client を作る。
- `src/lib/supabase/server.ts` は管理者 Auth session 用の cookie client を作る。
- service-role は全 application table、sequence、RPC、`prize-images` bucket に権限を持つ。最終 migration は public/anon/authenticated の権限を撤回している (`supabase/migrations/20260703000000_baseline.sql`、`20260709114808_remove_auth_role_checks.sql`)。
- 管理操作は `increment_reach` / `decrement_reach`、公開操作は `record_reaction_stamp` / `record_reach` RPC を呼ぶ (`src/features/admin/dashboard/actions.ts:55`、`:68`、`src/features/user/actions/bingo-public.ts:66`、`:86`)。いずれもBFFのservice-role client経由である。
- application tableとStorageにはRLS policyがあるが、最終状態ではpublic/anon/authenticatedのschema/table/function権限をrevokeし、service-role用policyだけを正規経路にしている (`supabase/migrations/20260703000000_baseline.sql:575`、`:602`、`:666`)。
- `requireAdmin()` は Auth user を取得し、service-role で `profiles.role === "admin"` を検査する (`src/lib/auth/auth.ts:20`)。
- Auth は email/password、signup 無効である (`src/features/admin/auth/actions.ts`、`supabase/config.toml`)。
- Supabase Realtime は使用せず、self-hosted production でも起動していない。

### 2.3 データモデル

| 現行 table             | 用途                                         | 移行先                                            |
| ---------------------- | -------------------------------------------- | ------------------------------------------------- |
| `profiles`             | Supabase Auth user の admin role             | Access identity + Worker allowlist                |
| `numbers`              | `id` 順の抽選済み番号、1–99 unique           | generation `GameState` SQLite                     |
| `prizes`               | 日英名、画像 path、当選 flag、表示順         | generation `GameState` SQLite                     |
| `app_state`            | survey URL/active、authoritative reach count | generation `GameState` SQLite singleton           |
| `reach_logs`           | reach 更新履歴                               | bounded admin audit、authoritative count は state |
| `reach_submissions`    | public client ごとの一度限り reach           | generation `GameState` SQLite                     |
| `stamp_triggers`       | append-only 演出 event                       | 非永続 `ReactionHub`                              |
| `public_action_limits` | client ごとの stamp 2秒制限                  | `ReactionHub` の短期 bounded limiter              |

現行 schema には generation、state revision、admin actor がない。年次 DB reset が実質的な event 境界である。

### 2.4 状態更新、polling、cache

- Home: visible 2秒、hidden 15秒 (`src/lib/polling.ts:199`)。
- Prizes: 5秒/15秒 (`src/lib/polling.ts:217`)。
- Screen state: 1.2秒/3秒 (`src/lib/polling.ts:238`)。
- Screen stamps: 0.5秒/1.5秒 (`src/lib/polling.ts:259`)。
- 旧APIはstate内容からSHA-256 ETagを作り、`s-maxage=1, stale-while-revalidate=4`を返していた (`src/lib/polling-server.ts:21`)。
- 移行後APIはrevision ETagを返し、現行realtime clientの障害fallbackは`cache: "no-cache"`と`If-None-Match`を送る。変更がなければ304となりresponse bodyを省けるが、Worker/Directory/GameState request数は減らない。
- 1000人が Home を表示すると `1000 / 2 = 500 req/s`、1時間で約180万 request になる。
- stamp は各 client 2秒制限でも最大 500 writes/s になり得る。一方、screen consumer は既定最大 100 events/s なので backlog が無制限に増える (`src/app/api/bingo/stamps/route.ts`)。

### 2.5 公開画面、管理画面、画像

- 公開 UI は `src/features/user` と `src/components/user` に分離されており、data hook を置換すれば見た目を維持できる。
- 管理 UI は `src/features/admin` にあり、`actions-client.ts` が Server Actions を thin wrapper しているため HTTP API wrapper に置換可能である。
- seed 景品は `public/PrizeItem`、upload 景品は private Supabase Storage の `prizes/{uuid}.{ext}` である。
- upload は Server Action で JPEG/PNG/WebP、2 MiB、magic prefix を検査する (`src/features/admin/prizes/actions.ts`)。ただし Server Action 既定 body 上限 1 MiB と矛盾し、1–2 MiB は到達前に失敗する。
- public image route が service-role で download し、same-origin response に変換する (`src/app/api/prize-images/[...path]/route.ts`)。
- DB と object storage は transaction ではないため orphan の可能性がある。景品 reorder も複数 update の `Promise.all` で部分成功し得る。

### 2.6 Docker、Cloudflare、CI、script

- production は PostgreSQL、Auth、PostgREST、Storage、Kong、migrate、Next app、Cloudflared の8 service である (`compose.prod.yml`)。
- Cloudflared は `app:3000` だけを公開する (`compose.cloudflare.yml`)。Workers、DO、R2、Access、Wrangler、OpenNext の設定はない。
- backup は app 群を停止し `pg_dump` と Storage tar を作る。restore は DB/Storage 全置換である (`infra/scripts/backup.sh`、`restore.sh`)。
- CI は format、lint、typecheck、React Doctor、knip、Docker build、Supabase checks を持つが Cloudflare deploy はない (`.github/workflows/ci.yml`)。
- 自動 test suite はない。
- `pnpm load:polling` は存在しない `scripts/poll-load-test.mjs` を参照し壊れている。
- `pnpm secrets:check` は scanner 自身に含む検出対象 prefix の label を自己検出し、CI を必ず失敗させる (`scripts/check-secrets.mjs:73`)。
- baseline の `fmt:check`、`lint`、`typecheck`、`doctor`、`knip`、Docker build は成功し、`secrets:check` だけ上記理由で失敗した。

## 3. 目標構成

```text
browser
  ├─ public HTML/JS/CSS/seed images ──> Workers Static Assets (Worker bypass)
  ├─ state WebSocket / public commands ──> small Worker
  │                                        ├─> GameDirectory DO
  │                                        ├─> active GameState DO (SQLite + hibernation WS)
  │                                        └─> fixed ReactionHub DO (ephemeral + hibernation WS)
  ├─ uploaded prize image GET ──> public image-only R2 custom domain/CDN
  ├─ /admin* ──> Admin Access ──> Worker JWT + admin allowlist ──> assets/API
  └─ /screen* ──> Screen Access ──> Worker JWT + venue allowlist ──> assets/API/WS

scheduled/admin backup ──> active GameState logical snapshot ──> private R2
restore ──> new GameState generation ── validate ──> GameDirectory pointer switch
```

### 3.1 Static Assets と route

`wrangler.jsonc` の asset binding は `out/` を参照する。`run_worker_first` は`/api/*`、`/admin*`、
`/screen`、`/screen/*`に限定し、`/_next/*`、一般公開 HTML、同梱画像では Worker を起動しない。
会場HTMLはStatic Assetだが、配信前にScreen Access JWTを再検証する。
`workers_dev:false`と`preview_urls:false`をproduction/stagingへ固定し、custom domainのAccess/WAFを
迂回して同じWorker quotaを消費できる別originを作らない。

Next.js の `headers()` は static export 非対応なので、静的 response の security header は `public/_headers` に移す。API response では Worker が同じ方針の header を付ける。

### 3.2 GameDirectory

- 固定 DO name を使う。
- SQLite に `active_generation` と pointer revision を保持する。
- 初期 generation を idempotent に作成する。
- restore は既存 generation を上書きせず、新 generation の import/検証完了後に pointer を1 transaction で切り替える。
- KV の eventual consistency を正本 pointer に使わない。

### 3.3 GameState

- DO name は `game:{generation}`。
- SQLite schema は `meta`、`numbers`、`prizes`、`app_state`、`reach_submissions`、bounded `audit_log` を持つ。
- mutation と revision increment を同じ SQLite transaction で行う。
- 景品 reorder も1 transaction とする。
- public state は revision 付き snapshot として返す。
- WebSocket upgrade 時に snapshot を1回送信し、以後は state change だけを送信する。
- `acceptWebSocket()` と Hibernation event handler を使い、application heartbeat は送らない。
- application hard capはpublic state socket 1,984、予約済みscreen state socket 16の合計2,000とし、公開接続が会場枠を枯渇させない。各上限超過時は`503 Retry-After: 30`を返す。
- reconnect は revision を送り、取りこぼした client には常に正しい snapshot を再送する。
- public reach の重複防止は generation 内だけに限定する。
- Free枠と2 MiB snapshotを守るため、景品100件、reach submission/log各2,000件、監査200件・payload 4 KiBをapplication hard capとする。

### 3.4 ReactionHub

- DO name は固定の`reactions`。generation切替でscreen socketを切断せず、消失許容eventを単一objectへ集約する。
- reaction screen socketは16接続をhard capとし、超過時は`503 Retry-After: 30`を返す。
- stamp を durable game state と audit log に書かない。
- browser が `localStorage` に保存した random UUID を送り、Worker はその UUID の小文字表現だけを SHA-256 hash にして、2秒/client の短期限界を適用する。接続元IPやUser-Agentはhashへ含めない。
- UUIDはstorage消去や改変で再生成できるため、これは誤操作を抑えるUX-level limiterであり、security boundaryではない。
- 直近1秒のbounded window、hibernation時に失われてもよい最大約2,000件のin-memory client map、50 accepted/sからのsampling、100 accepted/sのdrop、JST calendar dayごとのaccepted上限を持つ。
- 通常は受理 stamp を screen WebSocket へ送る。負荷時は sampling/drop し、最終的に stamp endpoint を停止する。
- sampling、drop、`STAMP_DAILY_LIMIT`は受理後のwrite/broadcast量だけを抑える。`202 dropped`を返す試行もWorkerとfixed ReactionHubを起動するため、inbound invocation枯渇はpre-Worker WAF rate limitと緊急blockで防ぐ。
- stamp の損失は明示的に許容し、抽選番号や景品状態へ影響させない。

### 3.5 Access と認可

- 異なるAUDのAccess applicationを`/admin*`と`/screen*`に作り、両方でCookie Pathを有効にする。
- 最大10管理者と最大10会場operatorの計20 identityは Access Free の50 users以内である。会場同時接続は3台だが、交代要員を共有accountへまとめない。
- Worker は `Cf-Access-Jwt-Assertion` を `jose` で検証する。JWKS は `jose` の freshness/reload 制御付き module cache で再利用する。
- `iss` と application audience (`aud`) を固定値で検査する。
- JWT email を用途別allowlistと照合する。管理identityは各 mutation の actor として audit に残す。
- 会場state、state socket、reaction consumer socketはすべて`/screen/api/*`へ集約する。公開socketのqueryは常に無視してpublic viewへ固定する。
- clientの30分ごとの再handshakeに加え、GameState/ReactionHubのalarmが会場socketを30分でserver側からhard-closeする。非協調clientもJWT失効後に無期限で接続を保持できない。
- local development だけは明示的な development flag と loopback hostname の両方を満たす場合に代替し、production では bypass を拒否する。
- Supabase password/session/service-role key は移行後 Worker に置かない。

### 3.6 Turnstile

- 公開REACH modalでManaged Turnstileをexplicit renderし、token取得前は送信を無効化する。
- `/api/bingo/reach`自身がSiteverifyを3秒timeoutで呼び、`success`、action `turnstile-spin-v1`、hostnameを検証する。
- tokenは最大2,048文字、5分、単回利用とし、成功後だけGameState DOを更新する。
- config/upstream障害は503、challenge/action/hostname不一致は403でfail closedとし、token/secret/IP/client IDをlogへ残さない。
- ambiguityを伴うretryはwidgetの新tokenと永続client IDを使用し、DO側dedupeで二重加算を防ぐ。
- 公式test secretの特殊応答は、明示的test mode、公式always-pass secret、loopback hostの3条件が揃うlocal開発だけで許可する。deploy scriptはtest modeを常に`false`へ固定する。

### 3.7 R2 image と snapshot

- `PRIZE_IMAGES`: 景品画像だけを持つ bucket。production は custom domain を設定し CDN cache を利用する。`.r2.dev` は無効化する。
- upload は admin API のみ。2 MiB、MIME、magic bytes、拡張子を検査し、`prizes/{sha256}.{ext}` の immutable key に保存する。
- DB/DO metadata commit に失敗した未参照 object は遅延 GC する。参照中 object は即削除しない。
- `GAME_BACKUPS`: public access を持たない snapshot bucket。
- snapshot は schema version、generation、revision、全 logical row、画像 key/hash manifest、作成時刻を含む canonical JSON と checksum を持つ。
- scheduled backup と admin-triggered backup を提供する。
- snapshotは2 MiB上限でも1年約0.71 GiB、400日約0.78 GiBになるため、`snapshots/` prefixに400日expirationを本番投入前に設定する。bootstrapはoperatorのretention判断なしに破壊的lifecycleを設定しない。
- content-hash keyの景品画像は、active generation、保持中snapshot、rollback windowのいずれからも参照されず、かつwindowより古いことをinventoryで確認してから削除する。自動GC未実装中は手動承認とし、参照中画像を削除しない。

## 4. 主な差分と移行リスク

| 差分/リスク                                                     | 対策                                                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Server Components の初期 DB fetch を失う                        | 静的 shell + mount 後の snapshot fetch/WS。loading UI を再利用する                                                        |
| Server Actions を失う                                           | typed same-origin API client に置換し、すべて Worker 側で入力/認可を再検査する                                            |
| Supabase Auth から Access への移行                              | 既存 admin email を allowlist/Access group へ事前登録し、並行確認期間を設ける                                             |
| DO schema migration 後は通常の Worker rollback だけでは戻せない | expand/contract migration、generation pointer、R2 snapshot を使用する                                                     |
| DO 1 object への集中                                            | 想定約1013 WSに対しapplication capをpublic 1,984 + screen 16/reaction 16へ設定する。heartbeatを禁止する                   |
| reconnect storm                                                 | exponential backoff + jitter、最大8 reconnect、最大6回のHTTP fallbackに制限する。online復帰/visible化時だけ復旧を再開する |
| 会場socket 16枠の先着占有                                       | publicとscreenを別capにし、専用Access、旧consumer削除、client再handshake + server alarm hard-closeで防ぐ                  |
| R2 と SQLite の非 atomic 更新                                   | immutable key、metadata commit、orphan GC、snapshot image manifest                                                        |
| Access 障害                                                     | public route は影響を受けない。管理 mutation は fail closed とする                                                        |
| stamp abuse                                                     | UUID limiterはUX用途に限定し、pre-Worker WAF、sampling/drop、日次停止、game state分離を併用する                           |
| public reachの偽UUID                                            | UUIDはdedupeだけに使い、Managed Turnstileを同じWorker内でserver検証する。開始時刻blockと手動監視も併用する                |
| Free quota 超過                                                 | Worker bypass、WS push、bot/rate controls、degraded mode、named operatorのAnalytics定期確認                               |
| static build 時の環境差                                         | public API は same-origin、media origin だけ build-time config。staging/prod artifact を分離する                          |

## 5. 実装フェーズ

### Phase 0: baseline と壊れた検査の修正

- secret scanner の自己検出を除外する。
- 欠落した polling load script を廃止し、新しい WebSocket/HTTP load script へ置換する。
- Cloudflare migration plan を repository に保存する。
- 検証: format、lint、typecheck、doctor、knip。

### Phase 1: Cloudflare build/config/test 基盤

- `wrangler`、Workers Vitest pool、Vitest、`jose` を pnpm/mise task で追加する。
- `wrangler.jsonc`、Worker entrypoint、generated binding types、Vitest config、local vars example を追加する。
- Next.js を static export にし、security headers を `_headers` に移す。
- Docker 内で static artifact を作る `Dockerfile.cloudflare` と task を追加する。
- 最小 Worker routing、health、Access guard、Static Assets fallback を test する。
- 検証: format、lint、typecheck、Workers test、Docker static build、doctor、knip。

### Phase 2: DO state と WebSocket

- `GameDirectory`、`GameState`、`ReactionHub` と SQLite migration を実装する。
- public snapshot、state WebSocket、reach/stamp command、admin mutation を実装する。
- revision、dedupe、transactional reorder、rate/drop policy、audit を test する。
- Hibernation WebSocket reconnect、broadcast、public枠枯渇時のscreen予約枠、alarmによる会場socket hard-closeをintegration testする。
- 検証: Phase 1 の全項目 + Workers test。

### Phase 3: R2、snapshot、Access

- R2 image upload/read metadata と logical snapshot export/import を実装する。
- new generation restore と atomic pointer switch を実装する。
- Access JWT verification、audience/issuer/email allowlist、fail-closed behavior を test する。
- 検証: Phase 2 の全項目。

### Phase 4: Next.js UI の static/realtime 化

- `connection()`、Supabase query、Route Handler、proxy、Server Action 依存を削除する。
- 公開 polling hook を state/reaction WebSocket hook + bounded HTTP fallback に置換する。
- public reach/stamp と admin action wrapper を Worker API fetch に置換する。
- 管理 page を static shell + client fetch にする。ログイン画面は Access identity/再認証案内へ変える。
- 景品画像 URL を static seed または R2 media origin に解決する。
- UI regression を browser smoke test で確認する。
- 検証: format、lint、typecheck、Workers test、Docker static build、doctor、knip。

### Phase 5: migration、CI、運用

- 旧Supabaseが未運用であることを確認し、one-shot export/importを不要として削除する。
- CI に static build、Workers tests、dry-run deploy、bundle size check を追加する。
- named operatorによるstaging-first production昇格、secret/resource bootstrap、Access/R2 custom domain、monitoring runbookを文書化する。
- WebSocket 接続/reconnect、state update、stamp overload の負荷 test script を追加する。
- legacy Supabase/Proxmox/Cloudflared構成と専用CI/依存を削除し、Cloudflare専用repositoryにする。

## 6. 変更予定ファイル

実装中に詳細名は調整するが、主な範囲は次の通り。

- `docs/cloudflare-migration-plan.md`、`README.md`、運用 runbook
- `package.json`、`pnpm-lock.yaml`、`mise.toml`、`knip.json`
- `next.config.ts`、`public/_headers`、`Dockerfile.cloudflare`
- `wrangler.jsonc`、`worker-configuration.d.ts`、`vitest.config.mts`
- `worker/**`: router、Access、validation、DO、R2、snapshot、protocol
- `src/app/**`: request-time page/handler/proxy の除去、static page 化
- `src/features/user/**`、`src/features/admin/**`: WebSocket/API client 化
- `src/lib/**`、`src/types/**`: protocol、API client、image URL
- `scripts/**`: resource bootstrap、deploy、load test、secret scanner 修正
- `.github/workflows/**`: Cloudflare quality/build/production・staging dry-run、手動staging分散負荷試験

実運用データがないことを確認後、Supabase/legacy Dockerファイルは削除した。

## 7. テスト方法

- Unit: validation、Access claim/allowlist、state reducer、snapshot schema/checksum、image signature。
- Workers integration: `@cloudflare/vitest-pool-workers` で Worker fetch、DO SQLite、generation switch、R2、WebSocket を実行する。
- Contract: public/admin endpoint の method、status、error body、revision、authorization を確認する。
- UI static build: Docker 内 `next build` がすべての page を `out/` に生成することを確認する。
- Browser smoke: public Home/Prizes/Screen、admin state/prize CRUD、Access rejection、WebSocket reconnect を確認する。
- Load: 1000 state WebSocket、10 admin、3 screen、reconnect wave、stamp burstを実行し、接続成功率、p95、DO error、drop率、invocation数を記録する。stagingでは1,000接続維持中に管理更新を複数回行い、全clientが新revisionへ到達するまでのp95とWorker/DO CPU・durationも別途計測する。
- Static checks: `pnpm fmt:check`、`pnpm lint`、`pnpm typecheck`、`pnpm doctor`、`pnpm knip`。

## 8. 切り替え方法

1. Cloudflare resource、staging domain、Access application/group、R2 custom domain を作成する。
2. stagingの空の`initial` generationで管理操作、画像、snapshot/restoreを確認する。
3. stagingで1000接続相当の負荷試験と、接続を維持した全socketへのstate broadcast rehearsalを行う。
4. productionの空の`initial` generationへ管理画面からイベントデータを登録する。
5. custom domain上でpublic、screen、admin、Turnstile、R2 imageをsmoke testする。
6. production snapshotを作成し、key、generation、revision、checksumを記録する。

## 9. ロールバック方法

### Cloudflare 内での状態ロールバック

1. 問題のある admin mutation と deploy を停止する。
2. 直前 snapshot を新 generation に restore する。
3. checksum/count と UI smoke を確認する。
4. `GameDirectory` pointer を復旧 generation へ原子的に切り替える。

既存 DO を破壊的に上書きしないため、切替前 generation へ pointer を戻すこともできる。schema migration 後は `wrangler rollback` だけに依存しない。

### Cloudflare構成のロールバック

旧container/database originは存在しない。Worker codeは直前の安全なversionへ戻し、データは直前generationの
再activateまたはprivate R2 snapshotから新generationへrestoreする。Access/WAF/DNSはaudit logと変更記録から
直前設定へ戻し、Everyone/Bypass policyや`workers.dev`を迂回路として有効化しない。

## 10. Cloudflare 利用量の概算

公式 Free 上限の基準:

- Workers: 100,000 requests/day、10 ms CPU/request。Static Assets request は無料・無制限。
- Durable Objects: 100,000 requests/day、13,000 GB-s/day、SQLite row reads 5,000,000/day、writes 100,000/day、total 5 GB。WebSocket upgradeは1 request、clientからDOへのWebSocket messageは20件ごとに1 requestへ換算される。outbound messageとWebSocket protocol ping/pongはrequest課金されない。本実装はclient heartbeatを送らない。
- R2 Standard: 10 GB-month、Class A 1,000,000/月、Class B 10,000,000/月、egress 無料。
- Access Free: 50 users。本構成はadmin 10 + venue operator 10で最大20 users。
- Turnstile Free: 20 widgets、widgetごと10 hostnames、challenge/verification回数は無制限。本構成はproduction/stagingの2 widgets。
- 1 DO あたり WebSocket 32,768 connections、soft 1,000 requests/s。

想定1開催日、1000 user、10 admin、3 screen:

下記のFree枠はaccount全体で共有される。別Worker/DO/R2、既存Access user、既存Turnstile widgetが使う分を
開催前に差し引き、20/50 Access users、2/20 widgets、request/storage余裕を本アプリ専用枠と仮定しない。

| 項目                                        |                   Worker request |                       DO request | 根拠/上限対策                                                                                |
| ------------------------------------------- | -------------------------------: | -------------------------------: | -------------------------------------------------------------------------------------------- |
| Static Assets                               |                                0 |                                0 | asset hitは無料・無制限でWorkerをbypass                                                      |
| 1,013 clientの初回GET + state WS            |                            2,026 |                            5,065 | full GETはDirectory + status + stateの3 RPC、WSはDirectory + GameStateの2 RPC。heartbeatなし |
| bounded recovery最大値                      |                           14,182 |                           34,442 | 1,013 client × (最大8 reconnect×2 DO + 最大6 full fallback×3 DO)。304時はこれより6,078少ない |
| 3 screenのreaction WS（初回 + 8 reconnect） |                               27 |                               27 | fixed ReactionHubへ直接接続。outbound messageはrequest課金なし                               |
| screenの30分Access再検証（8時間）           |                               96 |                              144 | stateはDirectory+GameState、reactionはReactionHub。3台 × 16再handshake                       |
| screen socket server hard-close alarm       |                                0 |                         約32以下 | active GameStateとReactionHubを30分ごとに起動。非協調clientにもJWT再検証を強制               |
| screen 8時間全断時の5分long-tail            |                              864 |                            1,728 | 3 screenのstate WS + full snapshotとreaction WSを保守的に計上。304なら288少ない              |
| admin/state HTTP mutation                   |                            2,000 |                          約4,000 | 10 adminの保守上限。Access、method/input制限                                                 |
| reach command                               |                            2,000 |                          約4,000 | retry込み。2,000 Siteverify subrequestを追加し、成功後だけDOを起動。UUID hashはdedupe用途    |
| stamp **attempt**                           | 15,000運用目標、25,000保守ケース | 15,000運用目標、25,000保守ケース | fixed ReactionHubへ直接1 RPC。pre-Worker WAFで試行自体を止める                               |
| backup/health/切替                          |                          500未満 |                      約1,000未満 | daily Cron + 手動操作を制限                                                                  |
| R2 storage                                  |                                - |                                - | snapshotは最大2 MiB/日、400日で最大約0.78 GiB。画像用に1 GiBを見込み約1.8 GiBを運用目標      |

DO durationはHibernation中に課金されないため、heartbeatを送らず通常は短いevent処理時間だけを使う。
保守的にDirectory、active GameState、ReactionHubの3 objectが8時間連続でactiveになった場合、128 MiB/objectとして
`0.125 GiB × 28,800秒 × 3 = 10,800 GB-s`、Free 13,000 GB-s/dayの約83%で、余裕は約2,200 GB-sしかない。
staging負荷試験ではAnalyticsのdurationを8時間へ外挿し、10,000 GB-sをwarning、11,000 GB-sをstamp停止・
管理bulk操作停止の判断点にする。複数generationを同時にhotにするrestore/rehearsalは開催中に行わない。

最悪境界を同日にすべて使うと、stamp 25,000 attempts、screen 8時間全断long-tail、30分Access再検証を
含むケースはWorker約46,700 requests、DO約75,400 requestsである。どちらも100,000/day内だが、bot、監視、
再試行のため残るDO予算は約24,600だけである。当日運用目標をstamp 15,000 attempts以下にすると
DO概算は約65,400である。正常reach 2,000件は外向きSiteverify subrequestを2,000件追加するが、
Turnstile Freeのverification回数は無制限である。不合格requestもWorkerを1回消費する一方、DOは起動しない。

`STAMP_DAILY_LIMIT=25000`が数えるのはaccepted stampであり、attempt数ではない。rate-limit、sampling、daily-limitで拒否したrequestもWorkerとfixed ReactionHubの1 DO requestを消費する。accepted stampだけがreaction counterを1 row writeするため最大25,000 writes/dayであり、client limiterは非永続memoryだけを使う。公開reach 2,000件はsubmission、metadata、state、log、revision、trimで最大約12,000 rows writtenを使う。通常admin/restoreの余裕を加え、70,000 rows/dayでwarning、80,000でstampとbulk操作を停止して20,000以上を緊急操作へ予約する。`STAMP_DAILY_LIMIT=0`ならWorkerで早期`202 disabled`を返してDOを起動しないが、Worker invocation自体は残る。したがってapplication capをquota/security boundaryとして扱わない。

R2 operationは月次で、仮に50景品を1000端末がcache missで読む開催を4回行ってもClass Bは約200,000/月で10,000,000/月の2%である。画像100件のuploadとdaily snapshotはClass Aで月約130回に留まる。custom-domain CDN hitはさらにorigin readを減らし、egress課金はない。Accessは管理者10 + 会場operator 10で50 user枠の40%である。Turnstileはproduction/stagingの2 widgetで20枠の10%である。DO SQLite writeはstampだけで最大25,000行/日だが、index更新、reach、景品reorderも行writeとして加算されるため、景品の大量並び替えを反復しない。旧generationの自動削除は未実装なので、5 GB total storageへ近づく前に保持方針を決める。

SQLite rows readはstate cacheが有効ならrevision確認が中心である。cacheが毎RPCで失われるread側だけの感度分析では、2,000 admin更新を100景品reorderとしても初回GET+WS、全recovery、screen long-tailと合わせて概算約450万rows/dayになる。ただし同じ操作は景品行だけで200,000 rows writtenを超えるためFree全体の有効なworst caseではなく、write上限が先に禁止する。通常操作でrows read 3,500,000/dayをwarning、4,000,000/dayをstamp停止・管理bulk操作停止の条件にする。

Worker Freeの10 ms CPU/requestは通常のsocket upgradeやsmall commandには余裕を見込む一方、最大2 MiBの
import、manual snapshot、restoreはJSON parse/validation/stringifyとSHA-256を含み、local wall timeだけでは
上限適合を証明できない。本番投入前に最大サイズsnapshotで一連の操作をstagingで3回行い、Worker/DO
AnalyticsのCPU/durationと失敗を記録する。10 ms超過が再現する場合はsnapshot上限を下げて再試験し、
それでも収まらなければ重い検証のbatch化またはWorkers Paidを選ぶまでproduction切替を停止する。

主な超過リスクはbot、WebSocket reconnect storm、stamp連打、UUID回転、画像をWorker proxyする設計である。public assetsとR2 image readをWorker requestから外し、warning/緊急停止閾値をWAFと当日runbookで運用する。Free planでは任意のWorkers/DO/SQLite使用量threshold通知を前提にできないため、当日operatorがAnalyticsを定期確認して手動停止する。Workers/DOのFree quotaは00:00 UTC（09:00 JST）にresetされるため、日本時間の日付境界と同一ではない。

無料枠は SLA ではなく、Workers Free の quota 超過時は動的 route が失敗し得る。開催前の負荷試験と、named operatorによるAccess users数、R2 usage、Worker/DO/SQLite Analyticsの定期確認を必須とする。

参考:

- <https://developers.cloudflare.com/workers/platform/pricing/>
- <https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/>
- <https://developers.cloudflare.com/workers/platform/limits/>
- <https://developers.cloudflare.com/durable-objects/platform/pricing/>
- <https://developers.cloudflare.com/durable-objects/platform/limits/>
- <https://developers.cloudflare.com/durable-objects/best-practices/websockets/>
- <https://developers.cloudflare.com/r2/pricing/>
- <https://developers.cloudflare.com/waf/rate-limiting-rules/>
- <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/>
- <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/>
- <https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/>
- <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>
- <https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/>
- <https://developers.cloudflare.com/turnstile/plans/>

## 11. Degraded mode

degrade は次の順で適用する。

1. stamp を global sampling し、画面へ送る数を抑える。
2. stamp の日次上限到達時は endpoint を `202 dropped` にし、演出だけを停止する。
3. reach animation は個々の event ではなく最新 count の state broadcast にまとめる。
4. WebSocket障害時、一般userはvisible 15秒/hidden 30秒から指数backoffするETag conditional HTTP snapshot fallbackを最大6回だけ行い、最後の正常stateを表示する。304はbodyを省くがrequest quotaは消費する。最大8回のWS reconnectとfallbackを使い切った後は、browserのonline復帰またはpage visible化で復旧を再開する。会場screenだけはstate/reactionとも5分間隔のlong-tail recoveryを続け、60秒安定接続後にattempt counterをresetする。
5. R2 image 障害時は placeholder/seed image を表示する。
6. Access/JWT 検証障害時は管理 mutationと会場画面をfail closedにする。Turnstile障害時は公開reachを停止し、検証をbypassしない。

抽選番号、景品当選状態、survey、reach authoritative count、admin authorization、snapshot/generation switch は簡略化・drop しない。

## 12. 本番投入前の外部作業

完了済み:

- 個人test account上でWorker、DO migration、環境別R2、application/media custom domainを構築し、
  Cloudflare専用architectureの機能検証を完了した。
- test環境でR2 image custom domainを有効化し、backup bucketと`r2.dev`を非公開にした。
- 異なるAUDのAdmin/Screen Access application、Cookie Path、exact-email policyを検証した。
- Managed Turnstile widget、hostname、sitekey/secretを登録し、実browserで確認した。
- account IDとAccess team domainをproduction/staging別に固定し、remote Wrangler操作が対象accountを
  明示しない限り実行できないfail-closed guardを実装した。
- stagingで1,000 state WebSocket、5回broadcast、最大2 MiB snapshot 3回のpromotion証跡を取得した。

団体production投入前の残作業:

- `nutfes.info@gmail.com`をowner/recoveryとする団体Cloudflare accountでMFA/recoveryを設定し、
  deploy担当と復旧担当をnamed memberとして招待する。
- 団体account IDをreview済み設定へ固定し、production zone、R2、Access、Turnstile、custom domain、
  WAF、backup lifecycleを新設する。個人account上の旧`production` resourceへ昇格しない。
- 当日管理者約10名（通常操作と緊急対応を担うインフラ代表者を含む）をexact-email Access policyと
  Worker allowlistへ登録し、private browser、Access audit、未登録identity拒否を確認する。
- 団体productionと個人stagingのaccount分離を`whoami`、R2 list、deployment listで確認する。
- 同一release SHAをstaging証跡から団体productionへ昇格し、production smoke、version ID、
  generation、snapshot keyを記録してからDNSをcutoverする。
- Free plan rate limiting rule、stamp/reach緊急block ruleを設定し、会場Wi-Fi NATでthresholdを調整する。
- 景品画像GC手順、当日監視runbook、operator training、復旧担当者を確定する。
- productionイベントデータ登録後に手動snapshotを作り、Worker version、active/previous generation、
  snapshot keyを記録する。
