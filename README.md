# nutfes-Bingo

技大祭当日に使う、Cloudflare上のリアルタイム・ビンゴアプリです。

## アーキテクチャ

- Next.js 16のApp Router UIをstatic exportし、Workers Static Assetsから配信します。
- 公開HTML、JavaScript、CSS、同梱画像は原則Workerを起動しません。
- 小型WorkerがHTTP API、Cloudflare Access認可、Turnstile検証、R2入出力を担当します。
- SQLite Durable Objectsの`GameDirectory`と`GameState`がゲーム状態の正本です。
- `ReactionHub`が消失許容のスタンプ演出をゲーム状態から分離します。
- 状態更新はDurable Objects WebSocket Hibernationで配信し、障害時だけ回数制限付きHTTP fallbackを使います。
- 景品画像は公開画像専用R2、logical snapshotは非公開R2に保存します。
- 管理画面と会場画面は別々のAccess applicationで保護し、WorkerでもAUDとemail allowlistを検証します。

OpenNextは使用しません。静的画面と専用Workerを分離し、Workers Freeのbundle、CPU、request上限に余裕を持たせています。

詳細は[移行計画](docs/cloudflare-migration-plan.md)と[本番運用runbook](docs/cloudflare-operations.md)を参照してください。

## 公開環境

| 環境       | Application                               | Prize images                              |
| ---------- | ----------------------------------------- | ----------------------------------------- |
| production | <https://bingo.tkymhrt.dpdns.org>         | <https://media.tkymhrt.dpdns.org>         |
| staging    | <https://staging-bingo.tkymhrt.dpdns.org> | <https://staging-media.tkymhrt.dpdns.org> |

`workers.dev`、preview URL、R2の`r2.dev`は無効です。管理者と会場operatorはnamed human identityだけをAccess policyとWorker allowlistへ登録します。

## 開発環境

Node `26.2.0`、pnpm `11.2.2`、Docker Engine、miseを使用します。package managerはpnpmだけを使い、Next.js buildとCloudflare開発runtimeはDocker内で実行します。ホストで`pnpm dev`や`pnpm build`を実行しないでください。

```bash
mise trust
mise install
mise run install
cp .dev.vars.example .dev.vars
mise run cloudflare:dev
```

ローカルURLは`http://localhost:8787`です。local buildはCloudflare公式dummy Turnstile keyを使用し、明示的test modeはloopbackでだけ有効です。

依存関係は次のtaskで変更します。

```bash
mise run add <package>
mise run add -D <package>
mise run remove <package>
```

## 品質チェック

```bash
pnpm fmt:check
pnpm lint
pnpm typecheck
pnpm test
pnpm doctor
pnpm knip
mise run cloudflare:check
```

`pnpm test`はCloudflare Workers Vitest runtimeでWorker、SQLite Durable Objects、R2、WebSocket、Access、Turnstileを検査します。ブラウザE2E suiteは未構成です。

`mise run cloudflare:check`はDocker static build、binding type freshness、Wrangler dry-run、Free planの3 MiB compressed bundle上限、Worker startup profileを確認します。

## Cloudflare resource初期化

Wranglerへlogin済みのoperatorが環境別R2 bucketを作成します。既存bucketは再作成しません。

```bash
mise run cloudflare:bootstrap
mise run cloudflare:bootstrap:staging
```

bucket作成後に次をCloudflare dashboard/APIで設定します。

- application custom domain
- 景品画像R2 custom domain
- `/admin*`と`/screen*`のAccess application
- environment別Managed Turnstile widget
- WAF rate limitと緊急block rule
- backup bucketの`snapshots/` 400日lifecycle

secretやAccess AUDをGitへ保存しません。

## Deploy

環境値はshell履歴へ直接書かず、権限制限した環境ファイルまたはCI secretからexportします。Turnstile secretはWrangler secretとして環境別に登録します。

```bash
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY --env staging

mise run cloudflare:deploy
mise run cloudflare:deploy:staging
```

deploy taskは`LOCAL_ADMIN_BYPASS`、`LOCAL_SCREEN_BYPASS`、`LOCAL_TURNSTILE_TEST_MODE`を常に無効化し、Access設定が空または不正なら失敗します。

## データとロールバック

旧Supabase環境は実運用されていなかったため、データ移行は行いません。repositoryから旧Supabase、PostgreSQL、Proxmox LXC、Cloudflared originとone-shot migration toolingを削除しています。

- Worker code障害: `wrangler rollback`で直前の安全なversionへ戻します。
- データ障害: 直前のDurable Object generationを再activateします。
- 状態破損: private R2 snapshotを新generationへrestoreし、検証後にpointerを切り替えます。
- Access、Turnstile、R2障害: bypassせずfail closedまたはdegraded modeへ移行します。

container/database originへのロールバック経路はありません。本番変更前にWorker version、active generation、snapshot作成結果を必ず記録してください。

## 無料枠とdegraded mode

想定最大は一般利用者1000人、管理者10人、会場画面3台です。Static Assets、heartbeatなしWebSocket、画像R2 custom domainを使い、通常運用ではFree枠内を目指します。

上限接近時は次の順で簡略化します。

1. スタンプをsamplingし、その後WAFで停止する。
2. reach演出を最新countだけへ集約する。
3. 一般利用者のWebSocket reconnectとHTTP fallbackを打ち切り、最後の正常状態を表示する。
4. Turnstile障害時は公開reachを停止し、Access/JWT障害時は管理・会場機能をfail closedにする。
5. 番号、景品、当選状態、アンケート、snapshot/generation切替を優先して維持する。

詳細なrequest/DO/R2推計、監視閾値、負荷試験、WAF停止条件は運用runbookに記載しています。
