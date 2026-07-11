# プロジェクトエージェントガイド

## 環境

- `mise.toml`とCIで定義しているNode `26.2.0`、pnpm `11.2.2`を使用してください。
- pnpmだけを使用し、npmやyarnは使用しないでください。
- 依存関係の追加・削除には`mise run add <pkg>`、`mise run add -D <pkg>`、または`mise run remove <pkg>`を使用してください。
- 依存関係を変更した場合は`pnpm-lock.yaml`も更新してください。

## ランタイム

- アプリケーションはViteでビルドするReact SPAとCloudflare Workerです。
- 静的asset、HTTP API、Durable Objects、ローカルSQLite、ローカルR2はCloudflare Vite pluginとWranglerを通じて動作します。
- ローカル開発とビルドはhost上で直接実行します。コンテナはアーキテクチャに含まれません。

## コマンド

- インストール: `mise install && mise run install`
- 開発: `pnpm dev`
- ローカルCloudflare状態のリセット: `mise run dev:reset`
- format: `pnpm format`
- format確認: `pnpm fmt:check`
- lint: `pnpm lint`
- 型確認: `pnpm typecheck`
- テスト: `pnpm test`
- ビルド: `pnpm build`
- productionビルド: `pnpm build:production`
- デプロイ: `pnpm deploy`
- React Doctor: `pnpm doctor`
- 未使用コード・依存関係の確認: `pnpm knip`

## 検証

- コードを変更した場合は、`pnpm fmt:check`、`pnpm lint`、`pnpm typecheck`、および変更箇所に対応するテストを実行してください。
- React、routing、hook、フロントエンドの動作を変更した場合は`pnpm doctor`を実行してください。
- 依存関係、export、entry pointを変更した場合やコードを削除した場合は`pnpm knip`を実行してください。
- runtime、routing、Worker、binding、依存関係を変更した場合は`pnpm build`と`pnpm exec wrangler deploy --dry-run`を実行してください。
- 明示的な許可なくremote targetに対して負荷試験を実行しないでください。実行には`ALLOW_LOAD_TEST=true`が必要です。

## アーキテクチャ境界

- browser codeはWorkerが公開する`/api/*`とWebSocket endpointだけを使用して通信します。
- `BingoRoom`は信頼できるイベント状態、version付きdelta、リーチ重複排除、SQLite永続化を担当します。
- `ReactionRoom`は独立してshard化・rate limitされ、リアクション負荷が番号操作を妨げないようにします。
- 景品画像のbyte dataはR2で非公開にし、`/api/prize-images/*`を通じて配信します。
- すべての`/api/admin/*`操作でWorkerがCloudflare Access JWTを検証します。ローカルバイパスは`ENVIRONMENT=local`の場合だけ許可し、`DEV_ADMIN_TOKEN`を必須とします。
- productionではCloudflare Workers Static Assets、Workers、Durable Objects、R2、Accessだけを使用します。
