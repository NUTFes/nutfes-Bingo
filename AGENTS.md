# Project agent guide

## Environment

- Use Node `26.2.0` and pnpm `11.2.2`, as defined in `mise.toml` and CI.
- Use pnpm only. Do not use npm or yarn.
- Add or remove dependencies with `mise run add <pkg>`, `mise run add -D <pkg>`, or `mise run remove <pkg>`.
- Dependency changes must update `pnpm-lock.yaml`.

## Runtime assumptions

- Development, app startup, and builds run through Docker.
- Do not run `pnpm dev` or `pnpm build` directly on the host.
- Static checks may run on the host: format, lint, typecheck, React Doctor, and knip.

## Commands

- Install: `mise install && mise run install`
- Dev: `mise run up`
- Stop dev stack: `mise run down`
- Format check: `pnpm fmt:check`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Build: `docker compose -f compose.dev.yml exec app pnpm build`

* React Doctor: `pnpm doctor`（React/Next.js/frontend changes only）
* Unused code/dependency check: `pnpm knip`

## Tests

- No automated test suite is currently configured.
- Do not invent or assume a test command.
- When reporting results, state that tests were not run because no test suite exists.

## Validation

- For most code changes, run at least:
  - `pnpm fmt:check`
  - `pnpm lint`
  - `pnpm typecheck`
- Run `pnpm doctor` when changing React, Next.js, routing, UI components, hooks, Server Actions, or frontend-facing behavior.
- Run `pnpm knip` when changing dependencies, exports, entry points, or deleting code.
- Run the Docker build when changes may affect runtime behavior, routing, Next.js config, server code, Docker config, or dependency resolution.
- If a check cannot be run, report which check was skipped and why.

## Architecture boundaries

- Browser code must not call Supabase Auth, PostgREST, or Storage directly.
- Public access must go through Next.js pages, Server Actions, or `/api/*` routes.
- Production runs on Proxmox LXC with Cloudflared.
- Cloudflared must expose only `app:3000`.
- Do not expose Kong, PostgreSQL, or Storage through public ports or Cloudflared tunnels.
- Realtime, Studio, Edge Functions, Analytics, postgres-meta, Supavisor, and imgproxy are not started by default.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
