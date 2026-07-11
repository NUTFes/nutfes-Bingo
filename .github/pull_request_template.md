## 概要

## Cloudflareへの影響

- [ ] Worker API
- [ ] BingoRoom Durable Object / SQLite schema
- [ ] ReactionRoom shard / WebSocket
- [ ] R2景品画像
- [ ] Cloudflare Access / 認可
- [ ] 静的asset / フロントエンド
- [ ] Cloudflare runtimeへの影響なし

## 検証

- [ ] `pnpm fmt:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm exec wrangler deploy --dry-run`
- [ ] 変更したUIのbrowser smoke test

## 運用とリスク

- [ ] シークレットと環境固有の値をcommitしていない
- [ ] Durable Object migrationへの影響を記載した
- [ ] 無料枠とリアクション縮退運転への影響を記載した
- [ ] rollbackとイベント当日の運用への影響を記載した
