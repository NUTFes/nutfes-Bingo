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

`cloudflare.project.env`のaccountに所属し、Workers Scripts writeとR2 writeを持つoperatorが実行します。
誤accountで同名resourceを作らないよう、bootstrap前に固定accountとcapabilityを検査します。

```bash
mise run cloudflare:whoami
mise run cloudflare:bootstrap:staging
mise run cloudflare:bootstrap
```

bootstrapは既存bucketを再作成しません。R2作成時にWranglerへbinding追加を委ねず、
`wrangler.jsonc`をbindingの正本、`cloudflare.project.env`をaccount・domain・AUD・sitekeyの正本にします。

次の順で外部resourceを設定します。

1. production/stagingのapplication hostnameとmedia hostnameを決める。
2. 景品R2 bucketへ環境別media custom domainを割り当てる。
3. custom domainが`Active`になるまで待ち、実objectのGETが`200`になることを確認する。
4. `/admin*`と`/screen*`へ環境別Access self-hosted applicationを作り、Cookie Pathを有効にする。
5. 管理者は`ADMIN_EMAILS`へ通常operatorと別identityのnamed break-glass管理者を最低1名ずつ、
   会場operatorは`SCREEN_EMAILS`へ最低1名をexact emailで登録する。Everyone、domain全体、Bypass、
   共有account、service tokenを人間向け画面に使わない。
6. production/staging両方の管理Access applicationへbreak-glass専用Allow policyを作る。対象をその
   exact emailだけにし、Independent MFAの`Custom MFA settings`を必須、MFA session durationを
   30分以下にする。通常operatorと同じpolicyへ混在させない。
7. 管理と会場で異なるAUDをWorker環境変数へ登録する。
8. environment別Managed Turnstile widgetを作り、対応するapplication hostnameだけを登録する。
9. Turnstile secretをWrangler secretへ登録する。
10. final Workerをdeployし、application custom domainを接続する。
11. `workers.dev`、preview URL、`r2.dev`に迂回経路がないことを確認する。

Accessだけを認可境界にしません。Workerは`Cf-Access-Jwt-Assertion`の署名、issuer、AUD、
expiryを検証し、さらに`ADMIN_EMAILS`または`SCREEN_EMAILS` allowlistを適用します。
設定が空、不正、または管理と会場のAUDが同一ならfail closedです。

会場socketは30分ごとにDurable Object alarmでserver側からhard-closeし、再接続時にAccessとWorkerが
JWTを再検証します。これはAccess applicationの対話的session期限とは別です。

## 通常の再デプロイ

この章だけをデプロイ手順の正本とします。同一のreview済みcommitを
`staging deploy → staging smoke・負荷・snapshot証跡 → production deploy → production smoke`
の順で昇格し、途中の失敗や未確認項目を飛ばしません。

`cloudflare.project.env`はcredentialを含まない公開設定の正本です。Cloudflare account ID、現在の
release branch、Worker名、URL、Access team/AUD、Turnstile sitekeyを固定しています。変更時は通常の
code reviewを通し、stagingから検証し直します。

GitHub Actionsはquality、build、production/staging dry-runと、credentialを使わない明示起動のstaging分散
負荷試験だけを行います。remote deployはAccess、Turnstile、Analyticsを確認できるnamed operatorがこの章を
対話的に実行し、CI secretからはdeployしません。

### 1. tool、account、release branchを準備する

必要条件:

- `mise.toml`のNode/pnpm
- Docker EngineとBuildx
- `cloudflare.project.env`のaccountへ所属するnamed human operator
- Workers Scripts write権限
- R2 bucket list権限。初回構築担当者はR2 write、Access、Turnstile、DNS/WAF変更権限も持つ

```bash
mise trust
mise install
mise run install
mise run cloudflare:whoami

set -a
. ./cloudflare.project.env
set +a
git fetch origin "$CLOUDFLARE_RELEASE_BRANCH"
```

新規cloneでrelease branchを初めてcheckoutする場合:

```bash
git switch --track "origin/$CLOUDFLARE_RELEASE_BRANCH"
```

既にlocal branchがある場合:

```bash
git switch "$CLOUDFLARE_RELEASE_BRANCH"
git pull --ff-only
```

次がすべて成功し、2つのSHAが同一でなければ進みません。deploy taskも同じ条件を再検査します。

```bash
git status --short
git rev-parse HEAD
git rev-parse "origin/$CLOUDFLARE_RELEASE_BRANCH"
```

`git status --short`は空である必要があります。detached HEAD、別branch、upstreamなし、未push、
remote tipより古いcommitからのdeployは拒否されます。

### 2. mode 600の環境ファイルを生成する

既存Workerのactive versionからemail allowlistを取得し、review済み公開設定と照合してGit管理外の
環境ファイルを作ります。値はterminalへ表示されません。

```bash
mise run cloudflare:env:init:staging
mise run cloudflare:env:init
stat -c '%a %n' .cloudflare.deploy.staging.env .cloudflare.deploy.production.env
```

期待値は両方とも`600`です。既存ファイルがある場合は停止するため、内容をreviewしてから明示的に更新します。

```bash
node scripts/init-cloudflare-deploy-env.mjs --env staging --force
node scripts/init-cloudflare-deploy-env.mjs --env production --force
```

初回Worker構築前だけは`cloudflare.deploy.*.env.example`をコピーし、`ADMIN_EMAILS`と
`SCREEN_EMAILS`を1〜10件の小文字email JSON配列へ置換します。空配列、example domain、
review済み公開設定と異なる値はdeploy taskが拒否します。

Turnstile secretはファイルへ保存しません。次で登録名を確認し、存在しない環境だけ対話的に登録します。

```bash
./scripts/cloudflare-wrangler.sh secret list --env staging
./scripts/cloudflare-wrangler.sh secret list --env=''

./scripts/cloudflare-wrangler.sh secret put TURNSTILE_SECRET_KEY --env staging
./scripts/cloudflare-wrangler.sh secret put TURNSTILE_SECRET_KEY --env=''
```

### 3. release commitを検証してrollback元を記録する

```bash
pnpm secrets:check
pnpm fmt:check
pnpm lint
pnpm typecheck
pnpm test
pnpm doctor
pnpm knip
mise run cloudflare:check
mise run cloudflare:check:staging

./scripts/cloudflare-wrangler.sh deployments list --env staging
./scripts/cloudflare-wrangler.sh deployments list --env=''
```

すべてexit `0`が必要です。React Doctorがwarningを出した場合、各項目をfalse positive、修正済み、
またはrelease ownerが承認した既知issueのいずれかへ分類してchange recordへ残します。exit codeだけで
warningを承認済みとみなしません。

deploy前のproduction/staging version ID、Git SHA、実施者、開始時刻をchange recordへ残します。

### 4. stagingへdeployする

環境値が親shellへ残らないsubshellで実行します。

```bash
(
  set -a
  . ./.cloudflare.deploy.staging.env
  set +a
  mise run cloudflare:deploy:staging
)
```

deploy taskはDocker static export、binding type、**staging configのWrangler dry-run**、
compressed bundle 3 MiB、startup profileを検査してからdeployし、version messageへ
`git:<full SHA>`を記録します。

### 5. staging自動smokeを記録する

```bash
mise run cloudflare:smoke:staging
```

active staging versionが現在のGit SHAであることに加え、公開HTML、ready/state API、実景品画像、
admin/screenのAccess redirectと別AUD、公開state WebSocketを検査します。成功時は
`.cloudflare/deployments/staging-<SHA>.draft.json`をmode `600`で作ります。

### 6. stagingで1000 socket broadcastを実行する

単一端末のegress制限を合格条件と混同しないよう、手動起動のGitHub Actions workflowで
4 runner × 250 socketを同時に保持します。workflowはcredentialを持たず、公開staging WebSocketへだけ
接続します。Actionsを実行できる`gh` loginと、許可済み管理画面を用意します。

terminal Aで開始時刻を5分後に固定してworkflowを起動します。

```bash
set -a
. ./cloudflare.project.env
set +a
sha=$(git rev-parse HEAD)
start_epoch=$(date -d '+5 minutes' +%s)

gh workflow run staging-load.yml \
  --ref "$CLOUDFLARE_RELEASE_BRANCH" \
  -f release_sha="$sha" \
  -f start_epoch="$start_epoch" \
  -f duration_seconds=300

sleep 5
run_id=$(
  gh run list \
    --workflow staging-load.yml \
    --branch "$CLOUDFLARE_RELEASE_BRANCH" \
    --event workflow_dispatch \
    --limit 20 \
    --json databaseId,displayTitle \
    --jq ".[] | select(.displayTitle == \"Staging load $sha @ $start_epoch\") | .databaseId" |
    sed -n '1p'
)
test -n "$run_id"
date -d "@$start_epoch"
gh run watch "$run_id" --exit-status
```

terminal Bでは表示された開始時刻から30秒後、5分以内に許可済み管理画面でreachの`+1`と`-1`を
3組実行します。6 revisionを発生させつつ最終値を元へ戻します。workflow成功後、terminal Aで
集約済み証跡を取得します。

```bash
mkdir -p -m 700 ".cloudflare/load-$run_id" .cloudflare/deployments
gh run download "$run_id" \
  --name staging-load-distributed \
  --dir ".cloudflare/load-$run_id"
install -m 600 \
  ".cloudflare/load-$run_id/staging-load-distributed.json" \
  .cloudflare/deployments/staging-load.json
```

workflowは指定Git SHAとcheckout SHAの一致、4 shardすべての成功、合計1000/1000 ready、
全1000 clientへのcomplete broadcast 5回以上、5xx、open failure、ready failureが0であることを
機械検証します。`mise run cloudflare:load:staging`は単一egressからの診断用であり、昇格証跡には
集約済みworkflow artifactだけを使用します。

### 7. stagingで最大snapshotを3回検証する

許可済みbrowserでstaging `/admin`へlogin後、DevToolsのApplication/Cookiesから
`CF_Authorization`の**値だけ**を取得します。shell履歴へ値を残さずmode `600`で保存します。

```bash
mkdir -p -m 700 .cloudflare
umask 077
read -r -s CF_ACCESS_JWT
printf '%s' "$CF_ACCESS_JWT" > .cloudflare/staging-access-jwt
unset CF_ACCESS_JWT
mise run cloudflare:snapshot:test:staging .cloudflare/staging-access-jwt
```

試験は上限件数の番号、景品、reach、dedupe、auditを持つlogical snapshotを、active pointerを変更しない
新generationへ3回importします。各回でread-back checksum、R2保存、`activated:false`を確認し、
`.cloudflare/deployments/staging-snapshot.json`へgenerationとobject keyを記録します。

直後にCloudflare dashboardのstaging Worker Analyticsで試験時間帯の
`POST /admin/api/import`を確認し、Worker CPU p95をms単位で記録します。Free planの10 msを超えた場合は
productionへ進みません。

### 8. 手動smokeを実施してstaging証跡を確定する

次を実際に確認します。

1. allowlist済み管理者が`/admin`を開き、戻せるmutationを1回実行できる。
2. allowlist外または未認証identityが`/admin`を拒否される。
3. allowlist済み会場operatorが`/screen`を開き、2本のWebSocketがreadyになる。
4. allowlist外または未認証identityが`/screen`を拒否される。
5. 実Turnstile solveでreachが一度だけ増え、retryでも重複しない。
6. 新規画像upload後、別private browserでもmedia URLが`200 image/*`になる。
7. screen socketが30分後に`1012`で閉じ、JWT再検証後だけ再接続する。
8. backup bucketをpublic URLから読めない。
9. Access audit、Worker/DO Analytics、WAF Events、当日snapshotをoperatorが閲覧できる。
10. 通常operatorと別identityのnamed break-glass管理者がprivate browserでMFA loginできる。
    専用policyのMFA session durationが30分以下で、Access auditに成功eventが残ることも確認する。

Cloudflare Analyticsで確認した最大snapshot CPU p95を引数へ渡し、各質問へ実確認後だけ`yes`と入力します。

```bash
mise run cloudflare:smoke:finalize:staging <cpu-ms-p95>
```

成功すると`.cloudflare/deployments/staging-<SHA>.json`が作られます。active staging version、
Git SHA、24時間以内の自動・手動check、1000 socket、5 broadcast、最大snapshot 3回、CPU 10 ms以下を
機械検証します。このrecordなしではproduction deployできません。

### 9. 同一commitをproductionへdeployする

```bash
(
  set -a
  . ./.cloudflare.deploy.production.env
  set +a
  export CONFIRM_PRODUCTION_DEPLOY="$(git rev-parse HEAD)"
  mise run cloudflare:deploy
)
```

deploy taskはlocal SHA確認だけでなく、active staging deploymentの`git:<SHA>`と上記の完全なsmoke recordを
照合します。異なるSHA、古いrecord、未完了項目が1つでもあれば停止します。

### 10. production smokeとversion IDを記録する

```bash
mise run cloudflare:smoke
mise run cloudflare:smoke:finalize
./scripts/cloudflare-wrangler.sh deployments list --env=''
```

stagingと同じ手動10項目をproductionでも確認します。最終record
`.cloudflare/deployments/production-<SHA>.json`にはactive production version ID、Git SHA、operator、
実施時刻、自動・手動結果が入ります。staging/production recordとdeploy前後のversion IDをteamの
change recordへ添付します。`.cloudflare/`はGit管理外であり、端末だけを恒久保管先にしません。

異常時は新しい管理操作を止め、このrunbookのロールバック手順へ進みます。

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

## 負荷・本番投入証跡

通常releaseの必須手順、出力先、合格条件は「通常の再デプロイ」手順5〜10を正本とします。
`scripts/cloudflare-load-test.mjs`は`--run`なしではtrafficを送らず、remoteは`--allow-remote`、
30,000 request超はさらに`--allow-quota-risk`がないと停止します。

`.github/workflows/staging-load.yml`は4 runner × 250 state socket、5分、5回以上のcomplete broadcastを
固定し、`scripts/merge-cloudflare-load-results.mjs`がmode `600`の1000 socket JSON evidenceへ
集約します。最大snapshot試験も3回、inactive generation、read-back checksum、R2保存を固定しています。
production昇格時は次を満たす24時間以内のstaging recordが必要です。

- active staging versionとrelease Git SHAが一致
- 公開HTTP、画像、Access redirect、WebSocketの自動smokeがすべて成功
- 1000/1000 socket ready、complete broadcast 5回以上、HTTP/WS failure 0
- 最大snapshot 3回、integrity一致、active pointer不変、R2保存、Worker CPU p95 10 ms以下
- Access identity、Turnstile、画像upload、30分再認証、backup非公開、観測、break-glassの手動確認

記録は`.cloudflare/deployments/`へ生成した後、staging/productionのversion ID、Git SHA、operator、
時刻とともにteamのchange recordへ添付します。口頭確認やterminal scrollbackだけを証跡にしません。

## degraded mode

1. reaction stampをsamplingし、その後WAFで停止する。
2. reach演出を最新countだけへ集約する。
3. 一般userのWebSocket reconnectは最大8回、HTTP fallbackは最大6回で停止し、最後の正常stateを表示する。
4. 会場screenだけは5分間隔のlong-tail recoveryを続ける。
5. Turnstile障害時はpublic reachを停止する。
6. Access/JWT障害時は管理mutationと会場画面をfail closedにする。
7. 番号、景品、当選状態、アンケート、snapshot/generation切替を優先して維持する。

## ロールバック

Worker codeだけの問題では、change recordのGit SHAとversion IDを照合し、対象環境を省略せずrollbackします。

staging:

```bash
./scripts/cloudflare-wrangler.sh deployments list --env staging
./scripts/cloudflare-wrangler.sh rollback <staging-version-id> --env staging --message '<incident-id>: <reason>'
```

production:

```bash
./scripts/cloudflare-wrangler.sh deployments list --env=''
./scripts/cloudflare-wrangler.sh rollback <production-version-id> --env='' --message '<incident-id>: <reason>'
```

rollback後のactive version ID、Git SHA、実施者、時刻、理由をchange recordへ追記し、自動・手動smokeを
対象環境で再実行します。対象versionが現在のAccess二重検証、screen専用endpoint、server-side Turnstileを
含むことを確認します。それ以前へ戻す必要がある場合は、会場consumer旧routeと`/api/bingo/reach`を先に
WAFでblockします。

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
- <https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/>
