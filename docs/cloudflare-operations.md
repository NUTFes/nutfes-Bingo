# Cloudflare本番運用

この文書がproduction deploy、当日運用、rollback、年次引継ぎの正本です。完成後は原則freezeし、週次運用は行いません。

## 固定architecture

```text
public static files ──────────────> Workers Static Assets
public state HTTP / WebSocket ───> Worker ─> GameState("game", SQLite DO)
public reach ─────────────────────> Worker ─> Turnstile ─> GameState
public stamp ─────────────────────> Worker ─> ReactionHub ─> Screen stamp socket
Admin / Screen ─> Access ─> Worker JWT/AUD/email検証 ─> GameState / ReactionHub / prize R2
```

- authoritative stateは固定名`game`の`GameState` 1個だけ。
- `ReactionHub`は消失許容reaction専用。`GameState`へ統合しない。
- public state WebSocketとbounded HTTP fallbackを維持する。
- public reachを維持するためTurnstile server validationも維持する。
- `/admin*`と`/screen*`は別Access applicationと別AUDを使い、Worker側email allowlistも維持する。
- 景品画像だけを`nutfes-bingo-prize-images` R2に保存する。2 MiB、MIME、magic bytes、content-hash keyを検証する。
- `GameDirectory`、generation、logical snapshot/import/restore、daily Cron、private backup R2、常設stagingはない。
- 30日以内の短期data recoveryはSQLite DO PITRだけを使う。

production account、Worker名、hostname、Access AUD、media origin、Turnstile sitekeyは`cloudflare.project.env`へ固定します。named email allowlistだけをmode `600`の`.cloudflare.deploy.production.env`へ置き、Turnstile secretはWrangler secretへ置きます。

## ゼロベース初回構築

旧production、旧Durable Object、旧migration historyは引き継ぎません。初回は次のresourceだけをorganization accountへ新規作成します。

- `nutfes-bingo` Worker、Static Assets、`GameState`/`ReactionHub` SQLite DO namespace
- `nutfes-bingo-prize-images` R2 bucketと`bingo-media.nutfes.net` custom domain
- `bingo.nutfes.net` Worker custom domain
- Admin用とScreen用のAccess application/policy
- managed Turnstile widgetとWorker secret
- disabled状態の`optional-public-mutations` WAF custom rule

`wrangler.jsonc`のDO migrationは最終classだけを作る`v1` 1件です。旧class削除migration、compatibility release、data importは作りません。構築手順は「Resourceを初回作成する場合」に限定し、通常年は再実行しません。

## 通常の年次準備

### イベント4〜6週間前

1. 団体Cloudflare accountへprimary/backup operatorがnamed accountでloginでき、MFAとrecovery contactが有効であることを確認する。共有owner loginは通常操作に使わない。
2. `develop`がremote defaultで、required CI、force-push/delete禁止を持つことを確認する。
3. fresh checkoutで`mise trust && mise install && mise run install`を実行する。Node、pnpm、Wrangler、Docker buildを現在のpinで再現できない場合はここで修正する。
4. dependency/security maintenanceを1回だけ行い、CI、CodeQL、Trivy、Actions Securityを確認する。重大advisory以外はoff-seasonに常設対応しない。
5. Cloudflare dashboardで次を確認する。
   - organization account IDと`nutfes-bingo` Worker。
   - app/media custom domain。`workers.dev`、preview URL、R2 `r2.dev`は無効。
   - Admin/Screen Access applicationのparent/nested path、AUD、session duration、named allowlist。
   - managed Turnstile widgetのhostnameと`TURNSTILE_SECRET_KEY`。
   - prize image R2 bucketとcustom domain。
   - `optional-public-mutations` WAF custom ruleが存在し、通常はdisabled。
   - account全体のWorkers/DO Free usageに他appの大きな利用がない。
6. `.cloudflare.deploy.production.env`をexampleから更新しmode `600`にする。Admin/Screenには当年のnamed identityを最低1人ずつ登録する。
7. Adminの「年次イベント開始」で新しいevent IDを二重入力し、前年の番号、景品、reach、surveyを一括resetする。R2画像、PITR下限、ReactionHubは保持される。
8. local Docker runtimeでpublic Home、Prizes、Admin、Screen、WebSocket、HTTP fallback、reaction、reach、画像uploadを確認する。
9. realtime、DO routing、socket cap、fallback、参加人数想定を変更した年だけ1000 socket試験を行う。
10. 紙master log、番号表、景品当選/引渡し表と`offline/projector.html`をoffline端末へ保存し、回線を切って操作する。

### イベント2〜4週間前のdeploy

`develop`のrelease対象をcommit/pushし、次だけを順番に実行します。

```bash
mise run preflight
mise run deploy
mise run smoke
```

`preflight`は次をfail closedで検査します。

- cleanな`develop` HEAD、upstream `origin/develop`、remoteとの完全一致。
- organization account membership、named operator、Workers write。
- pinned account、public座標、Turnstile secret、prize bucket。
- empty/placeholder allowlist、Admin/Screen同一AUD、Turnstile test key、stamp limitを拒否。
- production/full dependency auditのHigh 0、secrets scan、format、lint、typecheck、Worker tests、React Doctor、knip。
- Docker static build、generated binding、Wrangler dry-run、bundle、startup profile。

`deploy`は同じpreflightを再実行してから、同じHEADを`git:<SHA>` annotation付きでproductionへdeployします。CI secretからproduction deployしません。

`smoke`はactive deployment SHA/version、public static page、singleton readiness、HTTP conditional fallback、空bucketを許容するmedia origin、Admin/Screen parent/nested Access redirect、public WebSocketを検査し、JSON 1行を標準出力します。証跡file、24時間gate、manual attestation schemaはありません。

年次記録は次の4項目だけで十分です。

```text
date/time:
previous Git SHA / Worker version ID:
new Git SHA / Worker version ID:
smoke result:
```

### 手動UX rehearsal

自動smoke後に実端末で1回だけ確認します。

1. public Homeが現在番号、reach、surveyを表示し、reload後も同じstateになる。
2. Prizesが景品名、当選状態と、画像登録済みの場合はR2画像を表示する。
3. real Turnstileを解いたpublic reachが1回だけ増え、同じclient retryで重複しない。
4. stampがScreenへ届く。reaction停止中でも番号進行が続く。
5. allowed Adminが番号追加/更新/削除、reach増減、survey、景品作成/並替え/当選/削除、画像uploadを行える。
6. unlisted/unauthenticated identityはAdmin/Screenのparent/nested pathのedgeおよびWorkerで拒否される。
7. Home/ScreenがAdmin更新をWebSocketで受け、socket切断後はreconnectまたはHTTP fallbackで復帰する。
8. Screen state socketとstamp socketが別々に接続し、Screen Access境界を維持する。
9. test event IDで年次resetを行い、public reach iconが再表示され、前年dataが空になる。

## 1000 socket capacity確認

通常500人に対して1000 page instanceをcapacity baselineとします。release gateではなく、完成時またはcapacity-sensitive変更時だけ実行します。

1. `mise run cloudflare:dev`でlocal Workerを起動する。
2. 別terminalで次を実行する。

```bash
mise run capacity http://127.0.0.1:8787
```

3. 1000/1000 socket ready、ready failure 0、early close/error 0、5分保持を確認する。
4. broadcast経路を変更した場合はload中にAdminで5回reversible mutationし、`--expect-broadcasts 5`を明示したscript実行でも全socket受信を確認する。
5. event当日、通常release、単なる景品/番号data変更では再実行しない。

app capはpublic 1,984 + Screen 16です。Cloudflare platform上限より先にこのapp capでauthoritative DOを保護します。

## Free plan判断

public static assetsはWorkerをbypassします。1000 page instanceが初回HTTP、socket upgrade、保守的reconnect/fallbackを使う場合、基線は約16,000 Worker request / 16,000 DO requestです。500人通常ケースはこの半分程度です。

| dimension              |         Free基線 | 運用判断                                                |
| ---------------------- | ---------------: | ------------------------------------------------------- |
| Worker dynamic request |      100,000/day | static asset除外。optional mutationを先に停止する       |
| Worker CPU             | 10 ms/invocation | Access JWT、Turnstile、画像hashのp95をevent前に確認する |
| DO request             |      100,000/day | state request 1回=singleton GameState 1回               |
| SQLite row read        |    5,000,000/day | stateはsmall bounded tableとcacheを使う                 |
| SQLite row write       |      100,000/day | reach dedupe、audit、reaction attemptを監視する         |
| DO duration            |  13,000 GB-s/day | Hibernation eligibleなidle socket時間は課金対象外       |
| R2                     |      10 GB-month | prize imageのみ。上限接近時だけ年次GCを検討する         |

Free usageはaccount全体で共有されます。通常500/確認1000ではFreeを第一案とし、account aggregateまたは実測CPUが成立しない場合だけevent月Paidを判断します。

## optional public mutation kill switch

Cloudflare WAF custom ruleを1個だけ事前作成します。

- name: `optional-public-mutations`
- expression: `http.request.uri.path in {"/api/bingo/stamps" "/api/bingo/reach"}`
- action: Block
- normal state: Disabled

これはWorkerより前でstamp/reachを同時停止し、Free request/CPUとauthoritative GameStateを守る最後のswitchです。reaction/reach異常、bot traffic、quota急増時にprimary operatorがEnableし、司会へ「演出停止、ビンゴ継続」を伝えます。Turnstile障害時もreachだけをbypassせず、このruleで停止します。

off-seasonにsite全体を閉じる場合は別の単一`event-closed` edge ruleを使います。翌年preflight前にdisabledを確認します。

## イベント当日

### 開場前

- primary/backup operator、Cloudflare login、直前/active Worker version IDを確認。
- `mise run smoke`を1回実行。
- allowed Admin 1台、Screen実機、public端末で1回ずつ表示確認。
- `optional-public-mutations`がdisabled、Turnstileが解ける、stamp/reachが届くことを確認。
- 紙master logを開始し、以後のcalled number、取消、景品winner/引渡しを時刻順に記録。

### 開場後

通常監視は会場画面とAdmin更新だけです。開場15分後と異常時だけCloudflare dashboardでWorker 5xx、Worker/DO usage、optional mutation trafficを確認します。30分ごとのdashboard巡回、daily snapshot確認、weekly security workflowは行いません。

次をincidentとして扱います。

- Admin更新がpublic/Screenへ届かない。
- `/api/ready`またはpublic stateが5xx。
- Worker/DO Free usageが想定より急増。
- stamp/reach trafficが進行を妨げる。

reactionやpublic reachだけの停止はイベント停止ではありません。

### 終了後

- paper master logとAdmin stateを照合し、必要な結果だけ別途保存。
- `optional-public-mutations`または`event-closed`を必要に応じてenable。
- Worker version、incident、PITR receiptの有無を年次記録へ追記。
- R2画像は容量上限へ近づいた場合だけ、参照中content-hashを確認して削除する。
- 翌年まで週次on-call、daily backup、quarterly GCを置かない。

## Incident対応

### reaction / reach異常

1. `optional-public-mutations`をEnable。
2. stamp/reachを使わず司会と紙集計で継続。
3. GameStateの番号/景品/Admin更新が正常ならinfra変更をしない。

### code/assets/config regression

DO class/bindingを変更していない通常releaseだけ、記録した直前versionへ戻します。

```bash
previous_sha=<previous-git-sha>
./scripts/check-cloudflare-operator.sh
./scripts/cloudflare-wrangler.sh rollback <previous-version-id> --message "git:$previous_sha"
SMOKE_RELEASE_SHA=$previous_sha mise run smoke
```

rollbackはWorker code、assets、bindings、compatibilityを戻します。DO/R2 dataは戻しません。DO class/schemaを変更したreleaseは古いversionへ戻さずfix-forwardします。

### data誤操作

紙master logを正としてAdminから逆操作します。bounded audit logを時刻とactor照合に使います。軽微な誤操作でPITRを使わないでください。

### SQLite DO PITR

PITRはSQLとKVを含む`game`全体を過去30日へ戻し、既存WebSocketを切断します。localでは使えません。イベントをpauseし、紙master logを継続してから実行します。

1. allowed Admin browserから`CF_Authorization`値をmode `600` fileへ保存する。shell argumentへtoken値を直接書かない。
2. `/admin/api/recovery`の`pitrEarliestAt`より後のrestore時刻を二者確認しplanを作る。

```bash
mise run recover -- prepare \
  --target-time <UTC_TIMESTAMP_AFTER_PITR_EARLIEST_AT> \
  --access-jwt-file .cloudflare/admin-access-jwt
```

3. planのsite、release、event ID、revision、target bookmarkを確認する。
4. target bookmarkをconfirmationへ設定しrestoreする。

```bash
CONFIRM_PITR=<target-bookmark> mise run recover -- restore \
  --plan .cloudflare/recovery/<plan>.json \
  --access-jwt-file .cloudflare/admin-access-jwt
```

commandはreceipt pathを排他的にmode `600`で確保してからPITRをscheduleし、undo bookmarkを書いてfsyncしてからDOをrestartします。schedule後にCLIが中断しても、同じplan/outputでpending targetを再開できます。client WebSocket切断/reconnectは期待動作です。

5. Admin/public/Screen stateを紙master logと照合し、欠けた操作をAdminから追記する。
6. undoする場合はrestore receiptだけを入力にして次を実行する。raw bookmarkによる通常prepareはありません。

```bash
CONFIRM_PITR_UNDO=<undo-bookmark> mise run recover -- undo \
  --receipt .cloudflare/recovery/<receipt>.json \
  --access-jwt-file .cloudflare/admin-access-jwt
```

PITRが60秒以内に完了しない、Access/Cloudflare障害、復旧見込み不明の場合は観客の前で試行を重ねず、紙master logと静的projector fallbackでイベントを継続します。

## Resourceを初回作成する場合

通常年は実行しません。ゼロベース構築またはresource消失時だけ、organization accountを確認して実行します。

```bash
./scripts/check-cloudflare-operator.sh
./scripts/cloudflare-wrangler.sh r2 bucket create nutfes-bingo-prize-images --update-config=false
```

1. `r2.dev`を無効のままmedia custom domainを接続し、minimum TLSを1.2にする。
2. managed Turnstile widgetをapp hostnameへ限定し、secretを`TURNSTILE_SECRET_KEY`として登録する。
3. Admin Access applicationは`/admin`と`/admin/*`、Screen applicationは`/screen`と`/screen/*`を保護する。別AUD・named allowlistを使う。
4. app custom domainをWorkerへ接続し、`workers.dev`とpreview URLを無効のままにする。
5. disabledの`optional-public-mutations` WAF ruleを作る。
6. `develop`のfinal SHAから`mise run preflight && mise run deploy && mise run smoke`を実行する。

作成するDO classは`GameState`と`ReactionHub`だけ、R2は景品画像bucketだけです。private backup、Cron、KV、D1、Queue、常設stagingは作りません。

## Offline projector fallback

`offline/projector.html`はbuild、server、networkを使わずbrowserで直接開けます。紙master logを正本とし、offline画面は投影専用です。

1. イベント前にfileをoffline端末2台へcopyし、機内modeで開く。
2. 紙masterへ番号と時刻を記録してから、同じ番号を画面へ入力する。
3. 誤入力は「1つ戻す」で画面だけを訂正し、紙masterは取消線と訂正時刻を残す。
4. reload後にcalled numbersが端末内へ残ること、reset確認文なしでは消えないこと、fullscreen表示を確認する。
5. online復帰後は紙masterとAdmin stateを照合してから通常Screenへ戻す。

## 公式資料

- <https://developers.cloudflare.com/workers/platform/pricing/>
- <https://developers.cloudflare.com/workers/platform/limits/>
- <https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/>
- <https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/>
- <https://developers.cloudflare.com/durable-objects/platform/pricing/>
- <https://developers.cloudflare.com/durable-objects/platform/limits/>
- <https://developers.cloudflare.com/durable-objects/best-practices/websockets/>
- <https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/#pitr-point-in-time-recovery-api>
- <https://developers.cloudflare.com/r2/pricing/>
- <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>
- <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/>
