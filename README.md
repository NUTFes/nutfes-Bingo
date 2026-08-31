# nutfes-Bingo

技大祭当日に使うCloudflare上のリアルタイム・ビンゴアプリです。完成後は原則freezeし、年1回だけ起動・deployします。

## アーキテクチャ

- React UIをViteでbuildし、Cloudflare Vite plugin経由でWorkers Static Assetsから配信する。公開HTML、JavaScript、CSSは原則Workerを起動しない。
- same-origin WorkerがHTTP API、Cloudflare Access認可、Turnstile検証、景品画像R2、Durable Object routingを担当する。
- 固定名`game`のSQLite `GameState` Durable Object 1個が、番号、景品、当選状態、reach、survey、bounded audit logの正本になる。
- `ReactionHub` Durable Objectが消失許容のstampを正本から分離する。
- public stateはHibernation WebSocketで配信し、接続障害時は回数制限付きHTTP fallbackを使う。
- public reachはTurnstileをserver-side検証する。reachとstampは同じedge kill switchでWorker到達前に停止できる。
- `/admin*`と`/screen*`は別Cloudflare Access applicationで保護し、WorkerもJWT issuer、AUD、email allowlistを検証する。
- 景品画像は5 MiB/type/signatureを検証し、content-hash keyで専用R2へ保存する。
- data recoveryはSQLite Durable Object PITRだけを使う。`GameDirectory`、generation切替、logical snapshot、backup R2、daily Cronはない。

詳細と年次手順は[Cloudflare本番運用runbook](docs/cloudflare-operations.md)を参照してください。

## Cloudflare環境境界

productionは団体Cloudflare accountの`nutfes-bingo` Workerと、団体管理のapp/media custom domainを使います。通常deployに常設stagingや個人accountを使いません。DO/auth/bindingを再び変更する場合だけ、団体account内に一時的な検証環境を作ります。

`cloudflare.project.env`がaccount ID、Worker名、Access team/AUD、site/media URL、Turnstile sitekeyの公開正本です。credential、Access JWT、allowlist、secretはGitへ保存しません。`workers.dev`、preview URL、R2 `r2.dev`は無効です。

## 開発環境

Node `26.2.0`、pnpm `11.2.2`、miseを使用します。package managerはpnpmだけを使います。Cloudflare Vite pluginがフロントエンドHMR、Worker、Durable Object、R2、Static Assetsを同じローカル開発serverで起動します。

```bash
mise trust
mise install
mise run install
cp .dev.vars.example .dev.vars
mise run cloudflare:dev
```

ローカルURLは`http://localhost:8787`です。local buildはCloudflare公式dummy Turnstile keyを使用し、明示的test modeはloopbackでだけ有効です。

依存関係は`mise run add <package>`、`mise run add -D <package>`、`mise run remove <package>`で変更します。

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

`pnpm test`はWorkers Vitest runtimeでWorker、SQLite Durable Objects、R2、WebSocket、Access、Turnstileを検査します。ブラウザE2E suiteは未構成です。`mise run cloudflare:check`はVite/Worker production build、binding type freshness、生成済みWrangler設定によるdry-run、Free plan bundle上限、Worker startup profileを確認します。

## Deploy

通常deployは`develop`のcleanかつpush済みHEADから次の3 commandだけを実行します。

```bash
mise run preflight
mise run deploy
mise run smoke
```

`preflight`と`deploy`はGit HEAD、`origin/develop`、organization account、Worker、R2、Access座標、Turnstile sitekey/secretをfail closedで照合します。private `.cloudflare.deploy.production.env`はmode `600`で、named Admin/Screen allowlistだけを保持します。

1000 socket試験は通常release gateではありません。完成時またはrealtime/DO/capacityに影響する変更時だけ、local Workerに対して`mise run capacity http://127.0.0.1:8787`を実行します。

## Rollbackとdata recovery

- 通常のcode/assets/config regression: DO class/schemaを変えていない場合だけ、直前のGit SHAとWorker version IDを確認してrollbackし、そのSHAを指定してsmokeする。
- DO class/schemaを変えたrelease: 古いversionへ戻さずfix-forwardする。
- data誤操作: まずAdminで逆操作し、紙master logを正とする。
- 30日以内のstate破損: `mise run recover -- prepare ...`でplanを作り、二者確認後にPITRをscheduleする。commandはrestart前にundo bookmarkをmode `600` receiptへ保存する。
- Cloudflare全体または復旧長期化: optional reaction/reachを止め、紙master logと`offline/projector.html`でイベントを継続する。

PITRはlocal runtimeで実行できません。イベント前にproduction相当のremote dummy stateでrestoreとundoを1回rehearseします。

## Free planとdegraded mode

通常500人、capacity確認1000 page instanceを想定します。Static Assets bypass、heartbeatなしHibernation WebSocket、単一`GameState`により、1000 page instanceの保守ケースは約16,000 Worker request / 16,000 DO requestです。

異常時は番号・景品・当選状態・survey・Admin更新を優先し、次の順にoptional trafficを止めます。

1. `optional-public-mutations` edge ruleでstampとpublic reachをWorker到達前に同時停止する。
2. 会場進行を紙master logへ切り替える。reactionとpublic reachの停止をイベント停止理由にしない。
3. Worker/Access障害はbypassせずfail closedにし、復旧見込みが短い場合だけrollback/PITRを行う。
