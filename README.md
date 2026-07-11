# nutfes-Bingo

NUTFes のビンゴ大会向けリアルタイムアプリです。React SPA、Cloudflare Worker、SQLite-backed Durable Objects、R2、Cloudflare Access だけで動作します。静的ファイルは Workers Static Assets から配信され、API と WebSocket だけが Worker を実行します。

## 構成

- **React SPA / Vite**: 一般参加者、会場スクリーン、管理画面
- **Worker API**: `/api/*`、Cookie 発行、Origin 検証、Access JWT 検証、R2 配信
- **BingoRoom Durable Object**: 1イベント1オブジェクト。番号、リーチ、アンケート、景品、機能フラグ、versioned event を SQLite へ保存
- **ReactionRoom Durable Objects**: `REACTION_SHARDS` 個。リアクションを主要状態から分離し、クライアント・全体・イベント総量を制限
- **R2**: 最大 2 MiB の JPEG / PNG / WebP 景品画像。バケットは公開せず Worker 経由で配信
- **Cloudflare Access**: `/admin/*` と `/api/admin/*` を保護。Worker でも JWT の署名、`iss`、`aud`、期限を再検証

詳細は[アーキテクチャ](docs/architecture.md)と[WebSocketプロトコル](docs/websocket-protocol.md)を参照してください。

## 必要ツール

- Node.js `26.2.0`
- pnpm `11.2.2`
- mise
- Cloudflare アカウントと Wrangler 認証（デプロイ時のみ）

コンテナは不要です。

## ローカル起動

```bash
mise install
mise run install
cp .dev.vars.example .dev.vars
# COOKIE_SIGNING_SECRET と DEV_ADMIN_TOKEN をランダム値へ変更
pnpm dev
```

- 一般画面: <http://localhost:5173/>
- 景品: <http://localhost:5173/prizes>
- 会場: <http://localhost:5173/screen>
- 管理: <http://localhost:5173/admin>

ローカル管理画面では `.dev.vars` の `DEV_ADMIN_TOKEN` を入力します。このバイパスは `ENVIRONMENT=local` かつ `DEV_ACCESS_BYPASS=true` の場合だけ有効で、preview / production では必ず無効です。

ローカルの Durable Object SQLite と R2 を初期化する場合:

```bash
mise run dev:reset
```

## コマンド

```bash
pnpm dev                 # Vite + workerd + ローカルDO SQLite + ローカルR2
pnpm check               # バージョン、format、lint、型、テストを確認
pnpm test                # unit + integration
pnpm test:unit
pnpm test:integration
pnpm build               # ローカルCloudflare環境
pnpm build:preview
pnpm build:production
pnpm exec wrangler deploy --dry-run
pnpm deploy              # production環境をビルドしてデプロイ
pnpm test:load           # 既定では安全のためskip
```

リモート負荷試験は明示的な許可なしに実行しないでください。承認済みターゲットでのみ次を設定します。

```bash
ALLOW_LOAD_TEST=true \
LOAD_TEST_URL=http://localhost:5173 \
LOAD_TEST_CONNECTIONS=1000 \
LOAD_TEST_ALLOW_WRITES=true \
LOAD_TEST_ADMIN_TOKEN=local-admin \
pnpm test:load
```

## Cloudflare リソース

production 導入前に以下を作成します。

1. Worker `nutfes-bingo`
2. R2 bucket `nutfes-bingo-images-production`（公開アクセス無効）
3. SQLite-backed Durable Object namespaces `BINGO_ROOM` / `REACTION_ROOM`（初回 deploy の `v1` migration で作成）
4. Access self-hosted application と管理者 policy
5. Worker custom domain
6. GitHub Environment `production`

`wrangler.jsonc` は local / preview / production を分離します。Cloudflare Vite plugin では environment を build 時に選択するため、production は `CLOUDFLARE_ENV=production vite build` を使います。`wrangler deploy --env production` を build 後に指定しても environment は変わりません。

## シークレット

秘密値は Git へコミットせず Wrangler secret と GitHub Environment secret へ保存します。

```bash
pnpm exec wrangler secret put COOKIE_SIGNING_SECRET --env production
pnpm exec wrangler secret put ACCESS_AUD --env production
pnpm exec wrangler secret put ACCESS_TEAM_DOMAIN --env production
```

- `COOKIE_SIGNING_SECRET`: 32文字以上のランダム値
- `ACCESS_AUD`: Access Application Audience tag
- `ACCESS_TEAM_DOMAIN`: `https://<team>.cloudflareaccess.com`

CI/CD には最小権限の `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` も登録します。

## Access 設定

1. Zero Trust > Access > Applications で self-hosted application を作成
2. `/admin/*` と `/api/admin/*` を許可対象へ含める
3. 管理者 identity group だけを Allow policy へ追加
4. Application Audience tag と team domain を Worker secrets へ設定
5. production で `DEV_ACCESS_BYPASS=false` を確認
6. Access 経由の JWT を Worker が再検証できることを smoke test

管理 WebSocket を将来追加する場合も `/api/admin/*` 配下に置き、同じ Worker-side JWT 検証を必須にします。現在の管理画面は認証済み HTTP write と公開 read-only state WebSocket を使用します。

## R2 設定

- bucket の `r2.dev` 公開 URL は有効化しない
- CORS をブラウザ向けに開放しない（ブラウザは Worker API のみ利用）
- upload は管理 API のみ
- MIME type と magic bytes の両方を検証
- object key は Worker が UUID から生成
- `Cache-Control: public, max-age=31536000, immutable`

## Durable Objects

`BingoRoom` は `bingo-room:<EVENT_ID>`、リアクション shard は `reaction-room:<EVENT_ID>:<index>` です。SQLite DDL は constructor で idempotent に適用し、namespace の SQLite backend は `wrangler.jsonc` の `new_sqlite_classes` migration で作成します。

状態更新、version 増加、event log 書き込みは同一 `transactionSync` 内で行います。WebSocket は `acceptWebSocket()` と attachment を使う Hibernation API です。

## デプロイ

```bash
pnpm check
pnpm build:production
pnpm exec wrangler deploy --dry-run
pnpm exec wrangler deploy
```

GitHub Actions の `Deploy Cloudflare` は `main` merge または手動実行で、`production` Environment 承認、secret bulk、Durable Object migration を含む deploy、`/api/health` smoke test を実行します。

## 本番前・当日・障害時

実施手順は[運用手順](docs/operations.md)に集約しています。要点:

- 事前: Access、secrets、R2 非公開、production origin、4 shard、smoke / 1000 connection test を確認
- 開始: event initialization、機能フラグ、会場画面、一般画面を確認
- 障害: `reactionsEnabled` → `surveyEnabled` → `reachSubmissionEnabled` の順で停止
- `readOnlyMode`: 最後に SQLite へ保存した番号・景品・状態の閲覧を継続
- 終了: 状態を管理画面で記録し、必要な画像を保存後、event initialization を実行

## 無料枠

[無料枠の試算](docs/free-tier-budget.md)に、1,000接続・4時間の見積もり、縮退閾値、2026-07-11にローカルで実施した1,000 WebSocket接続の負荷試験結果を記載しています。Static Assets requestは無料で、Worker requestには数えられません。リアクションはshardごとにイベント最大4,000件、全体最大16,000件で自動停止します。

## 関連文書

- [アーキテクチャ](docs/architecture.md)
- [WebSocketプロトコル](docs/websocket-protocol.md)
- [運用手順](docs/operations.md)
- [無料枠の試算](docs/free-tier-budget.md)
- [移行記録](docs/migration-notes.md)
