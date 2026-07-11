# 移行記録

## 切り替え方針

このブランチでは、Cloudflareネイティブ構成へ完全に切り替えています。以前のruntime、API route、database schema、session、本番運用手順との互換layerは意図的に提供していません。

## 削除した構成

- Next.js server runtime、SSR、Server Components、Server Actions、BFF route、`next/cache`、`next/headers`
- ETagポーリングendpointとポーリングhook
- Supabase Auth、client library、CLI、migration、生成済みdatabase型、Storage、PostgREST、service role credential、profileベースの認可
- self-hosted PostgreSQLとすべてのdatabase bootstrap script
- Kong、GoTrue、Storage API、および関連設定
- 開発・本番用DockerfileとCompose file
- Proxmox LXC script、backup・restore script、年次コンテナ運用
- Cloudflare Tunnel設定とtoken処理
- Supabase・コンテナ用CI workflow
- Supabase専用のローカルagent skillとメンテナンステンプレート

## 追加した構成

- Viteでビルドし、Workers Static Assetsで配信するReact SPA
- Cloudflare Worker HTTP API
- SQLite-backed `BingoRoom`およびshard化した`ReactionRoom` Durable Objects
- snapshot・delta version protocolを使用するWebSocket Hibernation API
- 署名済み参加者Cookieとリーチ重複排除
- すべての管理API呼び出しに対するCloudflare Access JWT検証
- サイズ、MIME、signatureを検証する非公開R2画像lifecycle
- unit、integration、WebSocket、R2、および実行guard付き1,000接続負荷試験
- CloudflareネイティブCI/CDと本番承認Environment
- イベント当日の縮退用機能フラグと運用文書

## データ移行

旧databaseからのimportは提供せず、必要ともしていません。イベントは空のDurable Object状態として初期化します。過去の記録を保持する必要がある場合は、切り替え前にこのアプリケーションの外部へarchiveしてください。

Workerは設定済み`EVENT_ID`を使用して`bingo-room:<eventId>`を選択します。`EVENT_ID`を変更すると、以前のObjectを削除せずに新しい論理イベントObjectを作成します。

## API互換性

旧`/api/bingo/state`、`/api/bingo/screen`、`/api/bingo/stamps`、およびポーリング用response型は削除しました。現在の公開endpointは次のとおりです。

- `GET /api/session`
- `GET /api/state`（手動fallbackのみ）
- `GET /api/ws`（WebSocket）
- `GET /api/reactions/ws`（WebSocket）
- `POST /api/reach`
- `GET /api/prize-images/*`

管理操作には`/api/admin/*`を使用し、以前のServer Actionsとの互換性はありません。

## 運用移行

オリジンホスト、公開database、tunnel daemon、コンテナlifecycleはありません。運用先は次のように変わります。

- デプロイ、log、metrics: WranglerとCloudflare dashboard
- 管理者identityとpolicy: Access
- 状態: Durable Object SQLiteおよびPITR
- 景品画像: R2
- 本番デプロイ承認: GitHub Environment

DNSを切り替える前に、`README.md`と`docs/operations.md`に記載したすべての手動作業を完了してください。特に、実際のorigin、Access policy、R2 bucket作成、secret、GitHub Environment variable、および承認済みpreview負荷試験が必要です。
