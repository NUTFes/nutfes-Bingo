# Cloudflare本番運用

更新日: 2026-07-16

## 現在の公開境界

| 環境       | Application Worker custom domain          | R2 prize image custom domain              |
| ---------- | ----------------------------------------- | ----------------------------------------- |
| production | `https://bingo.tkymhrt.dpdns.org`         | `https://media.tkymhrt.dpdns.org`         |
| staging    | `https://staging-bingo.tkymhrt.dpdns.org` | `https://staging-media.tkymhrt.dpdns.org` |

- production Worker: `nutfes-bingo`
- staging Worker: `nutfes-bingo-staging`
- Access: 環境ごとに`/admin*`と`/screen*`を別application/AUDで保護
- 公開API: `/api/*`
- 管理API: `/admin/api/*`
- 会場API: `/screen/api/*`
- R2: 環境ごとに景品画像bucketと非公開snapshot bucketを分離
- production snapshot lifecycle: `snapshots/`を400日でexpire
- production/stagingとも`workers.dev`、preview URL、R2 `r2.dev`は無効

Static Assetsに一致する公開ページと`/_next/static/*`はWorkerを起動しません。`/api/*`、
`/admin*`、`/screen`、`/screen/*`は`run_worker_first`に一致します。会場HTMLはStatic
Assetですが、配信前にWorkerでもScreen Access JWTを検証します。

## 初回構築

Wranglerへloginできるoperatorが環境別R2 bucketを作成します。

```bash
mise run cloudflare:bootstrap
mise run cloudflare:bootstrap:staging
```

bootstrapは既存bucketを再作成しません。R2作成時にWranglerへbinding追加を委ねず、
`wrangler.jsonc`を正本にします。

次の順で外部resourceを設定します。

1. production/stagingのapplication hostnameとmedia hostnameを決める。
2. 景品R2 bucketへ環境別media custom domainを割り当てる。
3. custom domainが`Active`になるまで待ち、実objectのGETが`200`になることを確認する。
4. `/admin*`と`/screen*`へ環境別Access self-hosted applicationを作り、Cookie Pathを有効にする。
5. 管理者と会場operatorのnamed human identityだけをexact emailで許可する。Everyone、domain全体、
   Bypass、共有account、service tokenを人間向け画面に使わない。
6. 管理と会場で異なるAUDをWorker環境変数へ登録する。
7. environment別Managed Turnstile widgetを作り、対応するapplication hostnameだけを登録する。
8. Turnstile secretをWrangler secretへ登録する。
9. final Workerをdeployし、application custom domainを接続する。
10. `workers.dev`、preview URL、`r2.dev`に迂回経路がないことを確認する。

Accessだけを認可境界にしません。Workerは`Cf-Access-Jwt-Assertion`の署名、issuer、AUD、
expiryを検証し、さらに`ADMIN_EMAILS`または`SCREEN_EMAILS` allowlistを適用します。
設定が空、不正、または管理と会場のAUDが同一ならfail closedです。

会場socketは30分ごとにDurable Object alarmでserver側からhard-closeし、再接続時にAccessとWorkerが
JWTを再検証します。これはAccess applicationの対話的session期限とは別です。

## 通常の再デプロイ

必ず同一commitをstagingへ先にdeployし、smoke確認後にproductionへdeployします。deploy taskは
dirty working tree、環境指定の省略、production確認用Git SHAの不一致を拒否します。Cloudflareの
version messageにも`git:<full SHA>`を記録するため、未コミット成果物からはdeployできません。

### 1. operatorと環境ファイルを準備する

Node/pnpmは`mise.toml`のversionを使用し、Wranglerへ対象accountのoperatorとしてloginします。

```bash
mise install
mise run install
pnpm exec wrangler whoami
```

初回だけexampleをコピーし、環境ごとの実値へ置き換えます。実ファイルはGit管理外です。
`TURNSTILE_SECRET_KEY`はファイルへ保存せず、Wrangler secretとして環境ごとに登録します。

```bash
cp cloudflare.deploy.staging.env.example .cloudflare.deploy.staging.env
cp cloudflare.deploy.production.env.example .cloudflare.deploy.production.env
chmod 600 .cloudflare.deploy.staging.env .cloudflare.deploy.production.env

pnpm exec wrangler secret put TURNSTILE_SECRET_KEY --env staging
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
```

通常の再デプロイではsecretを再登録しません。登録済みであることだけをdeploy taskが検査します。
環境値はshell履歴へ直接書かず、上記ファイルまたはCI secretから読み込みます。Access team domainは
完全なHTTPS URL、email allowlistは小文字のJSON配列です。

### 2. release commitを検証する

対象branchをpullし、未追跡ファイルを含めてcleanであることと、deploy対象のfull SHAを確認します。

```bash
git pull --ff-only
git status --short
git rev-parse HEAD

pnpm secrets:check
pnpm fmt:check
pnpm lint
pnpm typecheck
pnpm test
pnpm doctor
pnpm knip
mise run cloudflare:check
```

frontend変更がない場合だけ`pnpm doctor`を省略できます。依存、export、entry point、削除がない場合だけ
`pnpm knip`を省略できます。Worker、routing、binding、Docker、Next.js設定、依存解決に変更がない場合だけ
`mise run cloudflare:check`を省略できます。

rollback対象を取り違えないよう、deploy前のversion IDを作業記録へ残します。

```bash
pnpm exec wrangler versions list --env staging
pnpm exec wrangler versions list
```

### 3. stagingへdeployしてsmoke確認する

環境値が親shellへ残らないsubshell内でstagingへdeployします。

```bash
(
  set -a
  . ./.cloudflare.deploy.staging.env
  set +a
  mise run cloudflare:deploy:staging
)
```

deploy後、`wrangler versions list --env staging`で最新versionのmessageが対象Git SHAであることを確認します。
最低限、公開ページとstate API、未認証時のAccess拒否、画像取得を確認します。さらに実スマートフォンの
browserでTurnstileをsolveし、reachが一度だけ増え、確認ボタンを押してから検証完了まで操作が保持される
ことを確認します。管理画面の画像upload後は、別browserまたはprivate windowでもcache削除なしで画像が
表示されることを確認します。

### 4. 同一commitをproductionへdeployする

staging smokeに合格した同一commitかつcleanなworking treeで、full SHAを確認変数へ設定します。
SHAが1文字でも異なる場合、production deployは停止します。

```bash
(
  set -a
  . ./.cloudflare.deploy.production.env
  set +a
  export CONFIRM_PRODUCTION_DEPLOY="$(git rev-parse HEAD)"
  mise run cloudflare:deploy
)
```

deploy後、`wrangler versions list`のversion IDとGit SHAを作業記録へ残し、productionでも公開ページ、
Access、state API、実browserのreach 1回、画像upload/表示を確認します。異常時は新しい管理操作を止め、
下記のロールバック手順へ進みます。

deploy taskはDocker内でNext.js static exportを作り、binding type freshness、Wrangler dry-run、
compressed Worker 3 MiB、startup profileを検査してからdeployします。公式dummy Turnstile sitekeyは
remote deployで拒否し、`LOCAL_ADMIN_BYPASS`、`LOCAL_SCREEN_BYPASS`、
`LOCAL_TURNSTILE_TEST_MODE`を常に`false`へ上書きします。

## 初期データ

旧Supabase環境は実運用されていなかったことを2026-07-13に確認しました。DB、Auth user、Storage objectの
移行は行いません。productionは空の`initial` generationから開始し、管理画面で番号、景品、アンケートを
設定します。管理者identityはCloudflare Accessで管理します。

repositoryには旧Supabase/Proxmox origin、one-shot export/import CLI、container rollbackを残しません。
データrollbackはDurable Object generationとR2 snapshotだけを使用します。

## 景品画像

upload APIはJPEG/PNG/WebP、2 MiB、MIME、magic bytesを検査し、
`prizes/{sha256}.{ext}`へimmutableで保存します。R2 custom domain経由の応答は長期cacheされます。
`GAME_BACKUPS`は公開せず、`PRIZE_IMAGES`だけをmedia custom domainで公開します。

R2 custom domain追加直後は状態が`Initializing`から`Active`になるまで数分かかる場合があります。
この間に画像GETが403になっても、upload失敗とは限りません。次の順で確認します。

```bash
curl -I https://media.example.com/prizes/<sha256>.png
curl -I -H 'Referer: https://bingo.example.com/'   https://media.example.com/prizes/<sha256>.png
curl -I https://bingo.example.com/api/prize-images/prizes/<sha256>.png
```

1. R2 Settingsでcustom domainが`Active`か確認する。
2. object key、`Content-Type`、`Cache-Control`を確認する。
3. direct mediaとsame-origin Worker proxyを比較する。
4. directだけ403ならdomain接続、WAF、Hotlink Protectionを確認する。
5. browserが古い403を保持している場合はhard reloadし、Network panelで実statusを確認する。

2026-07-13のstaging確認では、upload済みPNGはdirect、Referer付き、Worker proxy、Chrome上の
`<img>` requestがすべて`200 image/png`でした。初回403はcustom domain反映中の一時状態と判断しています。

### R2 retentionと画像GC

logical snapshotは1件最大2 MiBです。最大サイズを毎日保存すると400日で約0.78 GiBになります。
production backup bucketの`snapshots/`は400日expireを設定済みです。

景品画像はcontent-hash keyで、自動GCは未実装です。四半期ごとにactive generation、保持中snapshot、
rollback windowの全`image_path`をR2 inventoryと照合し、どこからも参照されない古いobjectだけを
承認付きで削除します。通常のR2利用目標はsnapshot約0.78 GiBと画像1 GiBを合わせて約1.8 GiB以下です。

## snapshotとgeneration切り替え

毎日03:00 JSTのCron Triggerがprivate R2 bucketへlogical snapshotを保存します。

- `GET /admin/api/snapshots`
- `POST /admin/api/snapshots`
- `POST /admin/api/snapshots/restore`
- `POST /admin/api/generations/activate`

restoreは稼働中objectを上書きせず、新generationへimport・検証してから`GameDirectory` pointerを
切り替えます。問題があれば直前generationを再activateします。

named operatorは毎日03:15 JST以降に当日snapshotのkey、generation、revision、checksumを確認します。
欠落時は手動snapshotを作成し、Worker logとR2状態を調査します。

## 無料枠の概算

2026-07-13時点の主なFree上限です。すべてaccount内の他用途と共有されます。

| Resource                |                        Free上限 |                      本アプリの運用目標 |
| ----------------------- | ------------------------------: | --------------------------------------: |
| Worker dynamic requests |                     100,000/day |                約46,700以下の保守ケース |
| Worker CPU              |                10 ms/invocation |                  remote Analyticsで確認 |
| Static Assets           |                    無料・無制限 |          公開HTML/JS/CSSをWorker bypass |
| DO requests             |                     100,000/day |                約75,400以下の保守ケース |
| DO duration             |                 13,000 GB-s/day |       10,000 warning / 11,000 hard-stop |
| DO SQLite reads         |              5,000,000 rows/day | 3,500,000 warning / 4,000,000 hard-stop |
| DO SQLite writes        |                100,000 rows/day |       70,000 warning / 80,000 hard-stop |
| DO SQLite storage       |                      5 GB total |              不要generationを定期棚卸し |
| R2 Standard storage     |               10 GB-month/month |                           約1.8 GiB以下 |
| R2 Class A/B            |              1M / 10M per month |                      通常は大幅に下回る |
| Turnstile               | 20 widgets、10 hostnames/widget |           production/stagingの2 widgets |

Workers/DOの日次上限は00:00 UTC（09:00 JST）にresetします。上限超過時、Free planでは追加課金で
継続するのではなく該当操作が失敗します。

1000 user、10 admin、3 screenの保守ケースは、初回state/WS、最大reconnectとHTTP fallback、30分ごとの
screen再接続、8時間のscreen long-tail、管理操作2000、reach 2000、stamp attempt 25000を含めて
Worker約46,700、DO約75,400 requests/dayです。通常stamp目標を15,000 attempts以下にすると
DOは約65,400です。

DO durationはHibernation中に課金されません。3 objectが8時間連続activeという保守境界は
`0.125 GiB × 28,800秒 × 3 = 10,800 GB-s`でFree枠の約83%です。heartbeatを送らず、開催中に
複数generationを同時にhotにしません。

## WAFと当日監視

application内のsamplingやdaily limitは、Worker/DOを起動した後の負荷しか減らしません。inbound
invocationはpre-Worker WAFで止めます。

- rate limiting rule: `/api/bingo/stamps`をsource IPごと500 requests/10秒、Block 10秒からrehearsal
- disabled emergency rule: `emergency-stop-bingo-stamps`
- disabled emergency rule: public reach block
- 開催前はreachをblockし、受付開始時刻だけ解除
- Turnstile障害時は検証をbypassせずpublic reachを停止

会場Wi-Fiの共有NATでは1000人が同じsource IPになるため、実Wi-Fiで正常p99を測り閾値を調整します。
当日operatorは開場前、開始15分後、以後30分ごと、終了直後にWorkers/DO AnalyticsとWAF Security Eventsを
確認します。

hard-stop条件:

- stamp attempts 15,000/day
- DO requests 60,000/day
- rows read 4,000,000/day
- rows written 80,000/day
- 8時間外挿DO duration 11,000 GB-s
- stamp 250 requests/sが30秒継続

hard-stop時はstamp WAF ruleを有効化し、reorder、snapshot restore、generation切替などのbulk操作を
停止します。番号、景品当選状態、authoritative reachの緊急操作用にrequest/write余裕を残します。

## 負荷確認

引数なしではtrafficを送信しません。最初はlocalで実行します。

```bash
pnpm run load:cloudflare -- --run   --base-url http://127.0.0.1:8787   --state-ws 1013 --reconnects 3 --stamp-burst 20000 --duration 30
```

remoteは`--allow-remote`が必要です。planned Worker/DO requestsの大きい方が30,000を超える場合は
`--allow-quota-risk`も必要です。

```bash
pnpm run load:cloudflare -- --run --allow-remote   --base-url https://staging-bingo.example.com   --state-ws 1000 --duration 300 --expect-broadcasts 5
```

1000 socketを維持したまま管理画面で5回更新し、全clientへのrevision到達、p95、fan-out span、
Worker/DO CPU、duration、errorを記録します。最大2 MiB snapshotの作成、restore、新generation activationも
stagingで各3回測定します。

2026-07-13のstaging smokeでは100 state WebSocket中100接続がready、失敗0、
ready latency p95約2.99秒、5xx 0でした。1000接続broadcast試験と最大snapshot CPU試験は未完了です。

## 本番投入直前の外部smoke

- production/stagingの意図したcustom domainだけが到達可能
- 許可済み、未許可、未認証identityで`/admin*`と`/screen*`が期待どおり
- `/screen/api/state`と2本のWebSocketが成功
- 30分後にscreen socketが1012で切れ、JWT再検証後に再接続
- production Turnstileを実browserでsolveし、reachが一度だけ増える
- 景品upload後、media custom domainと公開景品画面で画像が200
- backup bucketがpublic URLから読めない
- 03:00 JST snapshot、Access audit、Worker/DO Analytics、WAF Eventsをoperatorが閲覧可能
- named break-glass管理者を追加してMFAと短いsessionを確認
- 1000 socket broadcastと最大snapshot CPU試験を完了

## degraded mode

1. reaction stampをsamplingし、その後WAFで停止する。
2. reach演出を最新countだけへ集約する。
3. 一般userのWebSocket reconnectは最大8回、HTTP fallbackは最大6回で停止し、最後の正常stateを表示する。
4. 会場screenだけは5分間隔のlong-tail recoveryを続ける。
5. Turnstile障害時はpublic reachを停止する。
6. Access/JWT障害時は管理mutationと会場画面をfail closedにする。
7. 番号、景品、当選状態、アンケート、snapshot/generation切替を優先して維持する。

## ロールバック

Worker codeだけの問題:

```bash
pnpm exec wrangler versions list
pnpm exec wrangler rollback
```

rollback前に、対象versionが現在のAccess二重検証、screen専用endpoint、server-side Turnstileを含むことを
確認します。それ以前へ戻す必要がある場合は、会場consumer旧routeと`/api/bingo/reach`を先にWAFで
blockします。

データ問題:

1. 管理mutationを停止する。
2. 直前generationを`/admin/api/generations/activate`で再activateする。
3. 必要なら直前snapshotを新generationへrestoreする。
4. checksum、revision、番号、景品、reach、surveyを確認してpointerを切り替える。

Cloudflare構成問題:

1. Access/WAF/DNS変更を止める。
2. Cloudflare audit logと記録済み設定から直前のpolicy/domain構成へ戻す。
3. Everyone/Bypass policyや`workers.dev`を緊急迂回路として有効化しない。
4. 復旧中もpublic static pagesは維持し、管理・会場はfail closedにする。

旧container/database originはありません。Worker version、DO generation、private R2 snapshotが唯一の
rollback経路です。

## 公式資料

- <https://developers.cloudflare.com/workers/platform/pricing/>
- <https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/>
- <https://developers.cloudflare.com/durable-objects/platform/pricing/>
- <https://developers.cloudflare.com/durable-objects/platform/limits/>
- <https://developers.cloudflare.com/durable-objects/best-practices/websockets/>
- <https://developers.cloudflare.com/r2/pricing/>
- <https://developers.cloudflare.com/r2/buckets/public-buckets/>
- <https://developers.cloudflare.com/turnstile/plans/>
- <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>
- <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/>
