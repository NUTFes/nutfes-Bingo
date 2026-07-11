## Summary

## Cloudflare impact

- [ ] Worker API
- [ ] BingoRoom Durable Object / SQLite schema
- [ ] ReactionRoom shards / WebSockets
- [ ] R2 prize images
- [ ] Cloudflare Access / authorization
- [ ] Static assets / frontend
- [ ] No Cloudflare runtime impact

## Verification

- [ ] `pnpm fmt:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm exec wrangler deploy --dry-run`
- [ ] Browser smoke test for affected UI

## Operations and risk

- [ ] Secrets and environment-specific values are not committed
- [ ] Durable Object migration implications are documented
- [ ] Free-tier and reaction degradation implications are documented
- [ ] Rollback and event-day operational impact are explained
