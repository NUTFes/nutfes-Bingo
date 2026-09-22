# Project agent guide

## Environment

- Use Node `26.2.0` and pnpm `11.2.2`, as defined in `mise.toml` and CI.
- Use pnpm only. Do not use npm or yarn.
- Add or remove dependencies with `mise run add <pkg>`, `mise run add -D <pkg>`, or `mise run remove <pkg>`.
- Dependency changes must update `pnpm-lock.yaml`.

## Runtime assumptions

- The supported Cloudflare development runtime and Vite client/Worker build run through Docker.
- Do not run `pnpm dev` or `pnpm build` directly on the host.
- Wrangler CLI operations and static checks may run on the host: tests, format, lint,
  typecheck, React Doctor, and knip.

## Commands

- Install: `mise install && mise run install`
- Cloudflare dev: `mise run cloudflare:dev`
- Production artifact preview: `mise run cloudflare:preview` (same port as dev; run separately)
- Client/Worker artifact build: `mise run cloudflare:build`
- Worker/DO tests: `pnpm test`
- Worker validation: `mise run cloudflare:check`
- Format check: `pnpm fmt:check`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`

- React Doctor: `pnpm doctor`（React/frontend changes only）
- Unused code/dependency check: `pnpm knip`

## Tests

- Run `pnpm test` for Worker and Durable Object tests in the Workers Vitest runtime.
- Run `pnpm test:e2e` for Chromium browser E2E and `pnpm perf` for Lighthouse CI.
- Install the shared browser with `pnpm exec playwright install chromium` (Linux: `--with-deps` if needed).
- Both commands own an isolated Docker production preview on localhost:8788; run sequentially with that port free.
- Never point mutation E2E at production or reuse developer `.wrangler` state.

## Validation

- For most code changes, run at least:
  - `pnpm fmt:check`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
- Run `pnpm doctor` when changing React, routing, UI components, hooks, or frontend-facing behavior.
- Run `pnpm knip` when changing dependencies, exports, entry points, or deleting code.
- Run `mise run cloudflare:check` when changes affect Worker runtime behavior, routing,
  bindings, Docker config, Vite config, or dependency resolution.
- If a check cannot be run, report which check was skipped and why.

## Architecture boundaries

- Public pages are static Vite HTML entries. Dynamic access must go through the same-origin Worker API.
- Build exports `dist/client/` and `dist/worker/` together. Use generated `dist/worker/wrangler.json`
  for artifact validation and deploy; `wrangler.jsonc` remains the source of binding configuration.
- One fixed-name SQLite `GameState` Durable Object owns authoritative event state; the separate
  `ReactionHub` contains only loss-tolerant reactions.
- Admin pages and `/admin/api/*` require Cloudflare Access and Worker-side JWT validation.
- Prize images belong in R2. Short-term data recovery uses SQLite Durable Object PITR.
- Annual rollover uses the atomic event reset command; it does not create generations or databases.
- No legacy database, container origin, logical snapshot, backup bucket, or generation directory is
  available. Use Worker version rollback for code-only regressions, PITR for recent data recovery,
  and fix-forward after Durable Object class or schema changes.
