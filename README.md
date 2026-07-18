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

## Cloudflare環境境界

| 環境       | Cloudflare account                                     | Application / Prize images                      |
| ---------- | ------------------------------------------------------ | ----------------------------------------------- |
| production | 団体account（owner/recovery: `nutfes.info@gmail.com`） | 未構築。review済み座標を設定してから公開        |
| staging    | 現在の個人test account                                 | `staging-bingo` / `staging-media` custom domain |

既存の個人account上の`bingo.tkymhrt.dpdns.org`は本番昇格先ではありません。
`cloudflare.project.env`のproduction座標は意図的に空であり、団体account ID、Access、Turnstile、
custom domainを設定するまでproduction操作はfail closedです。両環境とも`workers.dev`、preview URL、
R2の`r2.dev`は無効にし、管理者と会場operatorはnamed human identityだけをAccess policyとWorker
allowlistへ登録します。

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
mise run cloudflare:check:staging
```

`pnpm test`はCloudflare Workers Vitest runtimeでWorker、SQLite Durable Objects、R2、WebSocket、Access、Turnstileを検査します。ブラウザE2E suiteは未構成です。

`mise run cloudflare:check`と`mise run cloudflare:check:staging`はDocker static build、binding type freshness、環境別Wrangler dry-run、Free planの3 MiB compressed bundle上限、Worker startup profileを確認します。

## Cloudflare resource初期化

stagingは現在の個人test accountに固定されています。

```bash
mise run cloudflare:whoami:staging
mise run cloudflare:bootstrap:staging
```

productionは`nutfes.info@gmail.com`をowner/recoveryとする団体Cloudflare accountへ新設します。
共有owner loginで日常運用せず、招待された個人accountのnamed operatorだけがdeployします。
account member招待、production account IDの固定、resource構築、当日管理者登録の正本は
[本番運用runbookの「団体production accountの初回構築」](docs/cloudflare-operations.md#団体production-accountの初回構築)
です。

credentialとsecretはGitへ保存しません。account ID、Access AUD/team domain、custom domain、
Turnstile sitekeyは公開設定として`cloudflare.project.env`へ固定します。

## Deploy

デプロイ手順の正本は[Cloudflare本番運用runbookの「通常の再デプロイ」](docs/cloudflare-operations.md#通常の再デプロイ)だけです。READMEのコマンドを抜粋して実行せず、runbookのchecklistを上から完了してください。

同一のreview済みrelease commitを必ず`staging deploy → staging smoke・負荷・snapshot証跡 → production deploy → production smoke`の順で昇格します。deploy taskは次をfail closedで検査します。

- `cloudflare.project.env`に環境別に固定したCloudflare account、Access team、release branch
- cleanかつpush済みで、`origin/<release branch>`と一致するHEAD
- 環境別のAccess AUD、hostname、media origin、Turnstile sitekey
- active staging versionのGit SHAと24時間以内の完全なsmoke記録
- production確認用Git SHA

Access AUD、account ID、hostname、Turnstile sitekeyは公開設定として`cloudflare.project.env`へ固定しています。productionは共有owner loginを拒否し、招待されたnamed operatorだけが操作できます。app管理者名簿はmode `600`のGit管理外JSONからdeploy環境へ反映し、Turnstile secretはWrangler secretとして保持します。placeholder、空allowlist、共有owner addressはdeployできません。

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
