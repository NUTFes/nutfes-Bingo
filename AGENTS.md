# Project agent guide

## Environment

- Use Node `26.2.0` and pnpm `11.2.2`, as defined in `mise.toml` and CI.
- Use pnpm only. Do not use npm or yarn.
- Add or remove dependencies with `mise run add <pkg>`, `mise run add -D <pkg>`, or `mise run remove <pkg>`.
- Dependency changes must update `pnpm-lock.yaml`.

## Runtime assumptions

- The supported Cloudflare development runtime and Next.js static build run through Docker.
- Do not run `pnpm dev` or `pnpm build` directly on the host.
- Wrangler CLI operations and static checks may run on the host: tests, format, lint,
  typecheck, React Doctor, and knip.

## Commands

- Install: `mise install && mise run install`
- Cloudflare dev: `mise run cloudflare:dev`
- Static artifact build: `mise run cloudflare:build`
- Worker/DO tests: `pnpm test`
- Worker validation: `mise run cloudflare:check`
- Format check: `pnpm fmt:check`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`

- React Doctor: `pnpm doctor`（React/Next.js/frontend changes only）
- Unused code/dependency check: `pnpm knip`

## Tests

- Run `pnpm test` for Worker and Durable Object tests in the Workers Vitest runtime.
- No browser end-to-end test suite is configured. Do not invent an E2E test command.

## Validation

- For most code changes, run at least:
  - `pnpm fmt:check`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
- Run `pnpm doctor` when changing React, Next.js, routing, UI components, hooks, Server Actions, or frontend-facing behavior.
- Run `pnpm knip` when changing dependencies, exports, entry points, or deleting code.
- Run `mise run cloudflare:check` when changes affect Worker runtime behavior, routing,
  bindings, Docker config, Next.js config, or dependency resolution.
- If a check cannot be run, report which check was skipped and why.

## Architecture boundaries

- Public pages are static exports. Dynamic access must go through the same-origin Worker API.
- Durable game state belongs in SQLite Durable Objects; loss-tolerant reactions stay separate.
- Admin pages and `/admin/api/*` require Cloudflare Access and Worker-side JWT validation.
- Prize images belong in R2; logical snapshots belong in the private backup R2 bucket.
- Runtime state, authentication, images, backup, and rollback must remain within the documented
  Cloudflare Worker, Durable Objects, Access, R2, and generation model.
- No legacy database or container origin is available for rollback; use Worker version rollback and
  Durable Object generation activation/snapshot restore.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
