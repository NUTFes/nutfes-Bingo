# nutfes-Bingo

技大祭当日に使うCloudflare上のリアルタイム・ビンゴアプリです。完成後は原則freezeし、年1回だけ起動・deployします。

## アーキテクチャ

- React UIをViteの複数HTMLエントリーからbuildし、Workers Static Assetsから配信する。公開HTML、JavaScript、CSSは原則Workerを起動しない。
- same-origin WorkerがHTTP API、Cloudflare Access認可、Turnstile検証、景品画像R2、Durable Object routingを担当する。
- 固定名`game`のSQLite `GameState` Durable Object 1個が、番号、景品、当選状態、reach、survey、bounded audit logの正本になる。
- `ReactionHub` Durable Objectが消失許容のstampを正本から分離する。
- public stateはHibernation WebSocketで配信し、接続障害時は回数制限付きHTTP fallbackを使う。
- public reachはTurnstileをserver-side検証する。reachとstampは同じedge kill switchでWorker到達前に停止できる。
- `/admin*`と`/screen*`は別Cloudflare Access applicationで保護し、WorkerはJWT issuer、AUD、署名、有効期限、`email`、`sub`を検証する。人員membershipの正本は各Access policyとする。
- 景品画像は2 MiB/type/signatureを検証し、content-hash keyで専用R2へ保存する。
- data recoveryはSQLite Durable Object PITRだけを使う。`GameDirectory`、generation切替、logical snapshot、backup R2、daily Cronはない。

詳細と年次手順は[Cloudflare本番運用runbook](docs/cloudflare-operations.md)を参照してください。

## Cloudflare環境境界

productionは団体Cloudflare accountの`nutfes-bingo` Workerと、団体管理のapp/media custom domainを使います。通常deployに常設stagingや個人accountを使いません。DO/auth/bindingを再び変更する場合だけ、団体account内に一時的な検証環境を作ります。

`cloudflare.production.env`がAccess team/AUD、site/media URL、Turnstile sitekeyの公開正本です。production account ID、Worker名、binding構成は`wrangler.jsonc`を正本とします。credential、Access JWT、secretはGitへ保存しません。Admin/Screenの人員membershipは各Cloudflare Access policy、またはそのpolicyが参照するreusable groupで管理します。`workers.dev`、preview URL、R2 `r2.dev`は無効です。

## 開発環境

Node `26.2.0`、pnpm `11.2.2`、Docker Engine、miseを使用します。package managerはpnpmだけを使い、Vite buildとCloudflare開発runtimeはDocker内で実行します。ホストで`pnpm dev`や`pnpm build`を実行しないでください。

```bash
mise trust
mise install
mise run install
mise run cloudflare:dev
```

ローカルURLは`http://localhost:8787`です。`cloudflare:dev`はソースをマウントしてVite HMRを使い、`mise run cloudflare:preview`はbuild済みのclient/WorkerをWranglerで配信します。両方とも同じportを使うため同時には起動しません。WSLなどでファイル変更を検知しない場合は`VITE_USE_POLLING=true mise run cloudflare:dev`を使います。

local runtimeはCloudflare公式dummy Turnstile key/secretを使います。明示的test modeはloopbackでだけ有効です。本番のTurnstile secretはWrangler secretだけで管理します。

`mise run cloudflare:build`はDockerから`dist/client/`と`dist/worker/`を一緒にexportします。Wrangler dry-run/deployは生成済みの`dist/worker/wrangler.json`を使います。公開build設定は`VITE_SITE_URL`、`VITE_MEDIA_ORIGIN`、`VITE_TURNSTILE_SITE_KEY`で指定し、本番では`preflight`が`cloudflare.production.env`から設定します。

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

`pnpm test`はWorkers Vitest runtimeでWorker、SQLite Durable Objects、R2、WebSocket、Access、Turnstileを検査します。`mise run cloudflare:check`はDockerでのclient/Worker build、binding type freshness、Wrangler dry-run、Free plan bundle上限、Worker startup profileを確認します。

### ブラウザE2EとLighthouse CI

```bash
# 初回・Playwright更新時。Linuxで共有ライブラリが不足する場合は --with-deps を付ける
pnpm exec playwright install chromium
pnpm test:e2e
pnpm perf

# E2EのHTMLレポートを開く
pnpm test:e2e:report
```

両commandは既存のDocker production previewを`http://localhost:8788`で自動起動・終了します。port 8788を空け、E2Eと性能計測は順番に実行してください。既存サーバーや任意のremote URLは使いません。毎回新しいcontainerのtmpfsにDO/R2の状態を作り、通常開発の`.wrangler`や本番データには触れません。build用URLとTurnstile keyはテスト値に固定し、Admin/Screenは既存のloopback限定local bypassだけを使用します。Cloudflare Accessの実ログインはE2E対象外です。

- `playwright.config.ts` / `e2e/`：Chromiumでモバイル幅のキーボード操作、番号の入力境界、管理画面での追加・削除→公開画面へのlive反映・reload後の永続化を検査します。Worker/APIをmockしません。失敗時のscreenshotとtraceは`test-results/`、HTMLは`playwright-report/`に保存します。
- `lighthouserc.cjs`：公開`/`と`/prizes/`をLighthouse標準のmobile条件で各3回計測します。PlaywrightのChromiumを再利用し、計測データは`.lighthouseci/`、HTML/JSONとmanifestは`lighthouse-report/`に保存します。外部のレポート公開serviceやAPI keyは使いません。
- CIはPR・developへのpush・手動実行で両方を実行します。E2E失敗時もLighthouseを実行し、生成できたレポートを`browser-quality-reports` artifactとして7日間保持します。レポートはGit・Docker build contextに含めません。
- Ubuntu CIでは、インストールしたChromium実行ファイルだけにAppArmorのuser namespace許可を設定します。Lighthouseの起動に`--no-sandbox`は使わず、OS全体の制限も無効化しません。[Chromium公式の説明](https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md)を参照してください。

#### 計測結果の読み方

1. CI artifactを展開し、`lighthouse-report/`のHTMLをブラウザで開きます。`manifest.json`からURLと代表runを確認し、JSONと`.lighthouseci/assertion-results.json`で数値・assertionを確認できます。
2. Performanceは総合スコアだけでなくLCP・CLS・TBTと、各auditの対象要素・resource・削減見込みを確認します。同じChrome・計測条件で複数runを比較してください。空のイベント状態でのlocal lab計測なので、当日の景品画像・人数・Cloudflare edge latencyや実ユーザーのINPを代表する値ではありません。
3. Accessibilityは自動検査だけで合格とは判断せず、E2Eのキーボード操作と手動でのfocus・読み上げ確認を併用します。問題を隠すためにauditを無効化したり閾値を下げたりしないでください。
4. Performance / Best Practices / SEOの90点未満はwarningとして分析対象にし、計測自体の失敗とAccessibilityが1回でも100点未満の場合はcommandを失敗させます。閾値は`lighthouserc.cjs`を正本とします。計測の揺れをテストretryで隠さず、実行環境とaudit結果を確認してください。

#### PageSpeed Insightsで公開環境を測る

[PageSpeed Insights](https://pagespeed.web.dev/)へ`cloudflare.production.env`の`CLOUDFLARE_PRODUCTION_SITE_URL`とその`/prizes`を入力し、mobile・desktopの両方を確認します。localhostやAccess保護下の管理・会場画面は対象にせず、認証を解除して測定しないでください。

Lighthouseのlab結果と、直近28日間のCrUX実利用データは別物です。実利用データがある場合は75パーセンタイルのLCP・CLS・INPを確認します。アクセスが少ない場合の「データなし」を合格扱いしません。PSI結果の共有URL、計測日時、対象deployのcommitをPRやIssueに記録して比較します。API clientや常設dashboardは追加せず、公式UIの分析機能を使います。

参考：[Playwright CI](https://playwright.dev/docs/ci)、[Lighthouse CI設定](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md)、[PSIのlab/field data](https://developers.google.com/speed/docs/insights/v5/about)。

## Deploy

通常deployは`develop`のcleanかつpush済みHEADから次の3 commandだけを実行します。

```bash
mise run preflight
mise run deploy
mise run smoke
```

`preflight`と`deploy`はGit HEAD、`origin/develop`、organization account、Worker、R2、Access座標、Turnstile sitekey/secretをfail closedで照合します。Admin/Screenの人員追加・通常削除はAccess policyだけを変更し、Git、deploy env、Worker deployは不要です。

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
