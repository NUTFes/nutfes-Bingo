# 無料枠の試算

試算日: 2026-07-11。年次イベントの直前にCloudflareの上限を必ず再確認してください。

公式資料:

- [Workersの料金](https://developers.cloudflare.com/workers/platform/pricing/)
- [Durable Objectsの料金](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [R2の料金](https://developers.cloudflare.com/r2/pricing/)
- [Static Assetsの課金](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)

## 試算に使用したFreeプラン上限

| リソース                |                                   無料枠 |
| ----------------------- | ---------------------------------------: |
| Worker動的request       |                             100,000件/日 |
| Static Assets request   | 無料・無制限。既定ではWorkerを起動しない |
| Durable Object request  |                             100,000件/日 |
| Durable Object duration |                           13,000 GB-s/日 |
| DO SQLite読み取りrow    |                           5,000,000件/日 |
| DO SQLite書き込みrow    |                             100,000件/日 |
| DO SQLite保存データ     |                                 合計5 GB |
| R2 Standard storage     |                           10 GB-month/月 |
| R2 Class A              |                           1,000,000件/月 |
| R2 Class B              |                          10,000,000件/月 |
| R2 egress               |                                     無料 |

Freeプランでは、上限を超えたoperationは失敗し、自動的に有料超過分として処理されることはありません。そのため、運用上の目標は100%ではなく70〜80%未満とします。

## イベントの前提条件

- 参加者1,000接続
- 4時間のイベント
- reaction shard 4個
- イベント中に参加者ごとに2回再接続（初回を含めて合計3回の接続wave）
- リーチ送信1,000回
- 管理操作は最大500回
- 景品画像20枚を用意し、すべての参加者が景品一覧を1回開く
- Bingo WebSocketで25秒間隔のapplication heartbeat
- リアクションのhard capは、`REACTION_SHARDS`で分割してイベント全体でaccepted 16,000件
- 通常運用では、拒否されたリアクションメッセージがaccepted件数を超えないと仮定

hard capは、クライアントの10秒cooldownから理論上許容できる件数より意図的に低く設定しています。SQLiteの書き込みrow数とDurable Object request数を保護するためです。

## Worker request

静的HTML、JavaScript、CSS、font、リアクション画像はStatic Assetsとして配信するため、Worker request枠を消費しません。

| 動的requestの発生源                        |     試算値 |
| ------------------------------------------ | ---------: |
| `GET /api/session`                         |      1,000 |
| Bingo WebSocket upgrade、3 wave            |      3,000 |
| 参加者のreaction WebSocket upgrade、3 wave |      3,000 |
| 会場reaction upgrade、4 shard × 3 wave     |         12 |
| Reach POST                                 |      1,000 |
| Admin API                                  |        500 |
| 景品画像読み取り、20 × 1,000               |     20,000 |
| 手動状態再同期の予備                       |      1,000 |
| **合計**                                   | **29,512** |

安全率: `100,000 / 29,512 = 3.39×`。推定使用率は29.5%です。

Worker requestでは画像読み取りが大半を占めます。ブラウザのimmutable cacheによって同じ端末からの重複読み取りを防ぎます。景品数が20点を大幅に超える場合は、イベント前に再試算してください。

## Durable Object requestとメッセージ

Cloudflareでは、DO WebSocket接続をrequestとして数えます。受信WebSocketメッセージは20:1の比率でrequestへ換算され、送信メッセージはrequestとして課金されません。

### BingoRoom

| 発生源                                                   |     試算値 |
| -------------------------------------------------------- | ---------: |
| WebSocket接続                                            |      3,000 |
| Heartbeat: `1,000 × 14,400 / 25 = 576,000` messages ÷ 20 |     28,800 |
| Reach RPC                                                |      1,000 |
| Admin/state RPCの予備                                    |      1,000 |
| **BingoRoom小計**                                        | **33,800** |

### ReactionRoom

| 発生源                                     |     試算値 |
| ------------------------------------------ | ---------: |
| Reaction WebSocket接続                     |      3,012 |
| accepted 16,000件 + rejected 16,000件 ÷ 20 |      1,600 |
| 全shardの管理用enable/reset RPC            |       <100 |
| **Reaction小計**                           | **<4,712** |

DO requestの合計推定値は**約38,512件/日**で、100,000件/日の上限に対して38.5%です。安全率は約**2.60倍**です。

悪意のある再接続によって、WorkerとDOのupgrade requestが増える可能性があります。管理トラフィックはCloudflare Accessで保護します。公開側で乱用が確認された場合は、zone levelのWAF・rate limitingでも制御する必要があります。

## Durable Object duration

各DOはactiveでHibernationできない間、128 MiB（`0.125 GB`）が割り当て・課金されます。

BingoRoomと4つのReactionRoom shardが4時間を通じてactiveである保守的な最悪ケース:

```text
5 objects × 4 hours × 3,600 seconds × 0.125 GB = 9,000 GB-s
```

これは13,000 GB-s/日の上限に対して69.2%、安全率1.44倍です。両classはHibernation WebSocket APIを使用し、idleでHibernation可能な時間はduration対象外となるため、実際の使用量はこれより少なくなる想定です。ただし、混雑時はheartbeatによってBingoRoomがactiveのままになる可能性があり、durationが最も余裕の少ないcompute budgetです。必ず監視してください。

DO durationまたはrequest使用率が70%に達した場合、リアクションを無効にします。80%に達した場合は番号操作を維持したまま、リーチ送信とアンケートも無効にします。

## SQLite row

### 書き込み

リアクションを1件受け付けると、クライアントレートrow、秒bucket、budget rowを更新します。text primary keyによるindex書き込みが加わる可能性があるため、accepted reactionごとに4 rowを書き込む前提で保守的に試算します。

```text
16,000 × 4 = 64,000 reaction rows written
```

Bingoのリーチ、管理操作、event logには10,000 rowを確保します。推定合計は**74,000 row**で、100,000件/日の74%、安全率1.35倍です。

### 読み取り

リアクションごとに10 row、管理操作・snapshot操作ごとに100 rowを読み取ると仮定しても500,000 row未満で、5,000,000件/日の10%未満です。

### 保存データ

最大256 rowのイベント履歴、100件未満の番号、小規模な景品一覧、1,000件のリーチハッシュ、shardごとに1,000件のリアクションハッシュを合わせても、5 GBを大幅に下回ります。過去のリアクションは保存しません。

## R2

画像20枚が各2 MiBである最悪ケース:

```text
20 × 2 MiB = 40 MiB ≈ 0.04 GB-month
```

| Operation             |        試算値 |          無料枠 |
| --------------------- | ------------: | --------------: |
| Class A upload/update |          <100 |  1,000,000件/月 |
| Class B image read    |        20,000 | 10,000,000件/月 |
| Delete                |          無料 |            無料 |
| Storage               | 0.04 GB-month |     10 GB-month |

R2には十分な余裕があります。無料枠の対象となるようbucketを非公開に保ち、Standard storageを使用します。

## 再接続とメッセージの試算

- Bingoの再接続upgrade: 初回1,000接続に加えて2,000件
- Reactionの再接続upgrade: 初回1,000接続に加えて2,000件、および会場の各shard接続
- 100回の抽選番号broadcast: 送信メッセージ100,000件。DO WebSocketの送信メッセージはDO requestとして数えません
- Heartbeat: 受信メッセージ576,000件。20:1換算で約28,800 DO request
- accepted reaction最大16,000件。1件ごとに参加者からの受信メッセージ1件と、会場への送信メッセージ1件

## ローカル1,000接続試験の結果

2026-07-11にローカルWrangler/workerdに対して次のコマンドを実行しました。

```bash
ALLOW_LOAD_TEST=true \
LOAD_TEST_URL=http://localhost:5173 \
LOAD_TEST_CONNECTIONS=1000 \
LOAD_TEST_REACTION_RATIO=0.1 \
LOAD_TEST_ALLOW_WRITES=true \
LOAD_TEST_ADMIN_TOKEN=local-admin \
pnpm test:load
```

| 指標                       |                              結果 |
| -------------------------- | --------------------------------: |
| 初回接続数 / error         |                         1,000 / 0 |
| 初回接続 p50 / p95 / max   | 1,552.44 / 1,585.12 / 1,597.23 ms |
| 再接続数 / error           |                         1,000 / 0 |
| 再接続 p50 / p95 / max     | 1,838.54 / 1,966.06 / 1,975.14 ms |
| 番号delta受信数 / error    |                         1,000 / 0 |
| Broadcast p50 / p95 / max  |        91.81 / 127.76 / 131.55 ms |
| リアクションクライアント数 |                               100 |
| 初回リアクションaccepted   |                               100 |
| 直後の2回目をrate limit    |                               100 |
| リアクションerror          |                                 0 |
| 推定upgrade数              |                             2,100 |
| 推定メッセージ数           |                             3,400 |
| 負荷試験processのheap増加  |                  25,584,216 bytes |
| 経過時間                   |                       5,340.39 ms |

この結果が証明するのはローカルでの動作とクライアントscriptの処理能力であり、Cloudflare edgeの遅延や本番処理能力ではありません。preview環境に対するリモート負荷試験には明示的な許可が必要です。また、DO duration、error rate、memory、切断metricsをCloudflare dashboardで確認する必要があります。
