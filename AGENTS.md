# Project agent guide

## Environment

- Use Node `26.2.0` and pnpm `11.2.2`, as defined in `mise.toml` and CI.
- Use pnpm only. Do not use npm or yarn.
- Add or remove dependencies with `mise run add <pkg>`, `mise run add -D <pkg>`, or `mise run remove <pkg>`.
- Dependency changes must update `pnpm-lock.yaml`.

## Runtime

- The application is a React SPA and Cloudflare Worker built with Vite.
- Static assets, HTTP APIs, Durable Objects, local SQLite, and local R2 run through the Cloudflare Vite plugin and Wrangler.
- Local development and builds run directly on the host; containers are not part of the architecture.

## Commands

- Install: `mise install && mise run install`
- Dev: `pnpm dev`
- Reset local Cloudflare state: `mise run dev:reset`
- Format: `pnpm format`
- Format check: `pnpm fmt:check`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Tests: `pnpm test`
- Build: `pnpm build`
- Production build: `pnpm build:production`
- Deploy: `pnpm deploy`
- React Doctor: `pnpm doctor`
- Unused code/dependency check: `pnpm knip`

## Validation

- For code changes, run `pnpm fmt:check`, `pnpm lint`, `pnpm typecheck`, and the focused tests.
- Run `pnpm doctor` for React, routing, hooks, or frontend behavior.
- Run `pnpm knip` after changing dependencies, exports, entry points, or deleting code.
- Run `pnpm build` and `pnpm exec wrangler deploy --dry-run` for runtime, routing, Worker, binding, or dependency changes.
- Never run the load test against a remote target without explicit authorization. It requires `ALLOW_LOAD_TEST=true`.

## Architecture boundaries

- Browser code communicates only with `/api/*` and WebSocket endpoints exposed by the Worker.
- `BingoRoom` owns authoritative event state, versioned deltas, reach deduplication, and SQLite persistence.
- `ReactionRoom` is independently sharded and rate-limited so reaction load cannot block number operations.
- Prize image bytes are private in R2 and served through `/api/prize-images/*`.
- Every `/api/admin/*` operation validates Cloudflare Access JWTs in the Worker. The local bypass is allowed only when `ENVIRONMENT=local` and requires `DEV_ADMIN_TOKEN`.
- Production uses Cloudflare Workers Static Assets, Workers, Durable Objects, R2, and Access only.
