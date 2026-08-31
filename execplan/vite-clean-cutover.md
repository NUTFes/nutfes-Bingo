# Replace Next.js with a Cloudflare Vite React frontend and simplify dead paths

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. It follows the ExecPlan methodology from `/home/tkymhrt/.agents/skills/execplan/references/PLANS.md`.

## Purpose / Big Picture

The application currently uses Next.js primarily as a static HTML and client bundle generator while Cloudflare Worker, Durable Objects, R2, Access, Turnstile, and WebSockets provide the runtime behavior. The development path builds a production Next.js image and then starts Wrangler, so frontend hot reload is not available. This work removes Next.js and moves the frontend to Vite with the Cloudflare Vite plugin, while preserving the public routes `/`, `/prizes`, `/screen` and the Access-protected admin routes. It also removes dead admin auth routes, redundant APIs, unused reaction variants, unnecessary virtualization and animation dependencies, stale configuration, and Server Action-shaped client abstractions identified in `docs/code-review.md`.

A successful result can be observed by starting the Cloudflare Vite development server, loading the public and admin routes directly, reloading them without a 404, exercising the public modal/navigation and admin views, and seeing frontend edits update through Vite HMR. Static checks, Worker tests, Cloudflare validation, React Doctor, and browser checks must all pass or any environment-specific blocker must be recorded here and in the draft PR.

## Progress

- [x] (2026-08-31 05:16+09:00) Read repository instructions, `docs/code-review.md`, the ExecPlan skill, and the agent-browser skill.
- [x] (2026-08-31 05:18+09:00) Fetched `origin/develop`, confirmed the local base was current, and created `refactor/cloudflare-vite-clean-cutover`.
- [x] (2026-08-31 05:24+09:00) Inventoried Next routes, Worker asset routing, client bootstrapping, responsive image/font behavior, tests, scripts, CI, Wrangler config, and deployment flow.
- [x] (2026-08-31 05:39+09:00) Removed dead admin auth routes, redundant Worker APIs, hidden reactions, stale configs, and aligned the documented upload limit to 5 MiB.
- [x] (2026-08-31 05:40+09:00) Reduced admin bundle complexity by removing root barrels, React Aria virtualization, framer-motion, and react-icons usage.
- [x] (2026-08-31 05:57+09:00) Simplified initial-state props, ActionResult/FormData client wrappers, shared validation limits, native navigation, and public native dialog semantics.
- [x] (2026-08-31 06:07+09:00) Completed the clean Vite cutover with React, Cloudflare, and Tailwind Vite plugins; removed Next.js, Docker, App Router, and PostCSS-only build paths from the committed tree.
- [x] (2026-08-31 06:18+09:00) Ran `pnpm check`, Worker tests, React Doctor, knip, and Cloudflare build/dry-run/startup checks. All blocking checks pass; React Doctor reports two non-blocking existing maintainability warnings.
- [x] (2026-08-31 06:15+09:00) Verified `/`, `/prizes`, `/screen`, `/admin`, `/admin/prizes`, and `/admin/prizes/new` with `agent-browser`, including direct navigation/reload, public/native modal behavior, admin modal open/close, and live Vite HMR.
- [x] (2026-08-31 06:25+09:00) Inspected the final staged diff, committed and pushed the branch, and created draft PR #386 against `develop`.

## Surprises & Discoveries

- Observation: `docs/code-review.md` is present as an untracked file on the starting `develop` checkout.
  Evidence: `git status --short --branch` reported `?? docs/code-review.md` before branch creation. It is treated as user-owned input and will not be modified or committed unless required later.

- Observation: repository-level `/home/tkymhrt/.codex/RTK.md` requires shell commands to be prefixed with `rtk`, but `rtk` is not on the DevSpace shell PATH.
  Evidence: `rtk ...` failed with `command not found`; the executable exists at `/home/tkymhrt/.local/bin/rtk`, so subsequent shell commands use that absolute path.

- Observation: `@cloudflare/vite-plugin@1.53.1` requires a newer Wrangler than the repository's pinned `4.123.0`, while `1.52.0` supports that Wrangler line.
  Evidence: package peer metadata reports `wrangler ^4.125.0` for `1.53.1` and `wrangler ^4.122.0` for `1.52.0`; the final package pins `@cloudflare/vite-plugin` to `1.52.0` and keeps Wrangler `4.123.0`.

- Observation: the Vite plugin writes the deployable Worker configuration to `dist/nutfes_bingo/wrangler.json` and fills the static asset directory as `../client`.
  Evidence: the generated config contains the Worker bindings plus `assets.directory: "../client"`; Cloudflare dry-run reads 55 client files successfully from that directory.

- Observation: protected `/admin` and `/screen` pages pass through the Worker, so a strict production CSP blocks Vite's development-only inline React Refresh preamble.
  Evidence: `/admin` initially returned HTML but rendered blank under `script-src 'self'`; allowing inline scripts only when the existing local Access bypass is enabled restored the page while production defaults remain strict.

- Observation: Wrangler `types --check` compares its generated runtime header literally and emits a trailing space when `compatibility_flags` is empty.
  Evidence: removing the trailing space makes `wrangler types --check` fail even though the type body is unchanged. `worker-configuration.d.ts` is therefore excluded from oxfmt and checked by Wrangler itself.

## Decision Log

- Decision: Treat the ordered implementation section of `docs/code-review.md` as the requested work scope, including the Vite clean cutover, rather than limiting the task to one isolated recommendation.
  Rationale: The user asked to implement according to that document without naming a narrower issue. The document explicitly provides an implementation order and migration acceptance checks.
  Date/Author: 2026-08-31 / ChatGPT

- Decision: Keep Cloudflare Worker, Durable Objects, R2, Access JWT verification, Turnstile server validation, WebSocket behavior, React Aria accessibility primitives, and existing operational recovery tooling intact.
  Rationale: `docs/code-review.md` explicitly identifies these as current requirements rather than YAGNI candidates.
  Date/Author: 2026-08-31 / ChatGPT

- Decision: Do not introduce React Router or another meta-framework.
  Rationale: The route set is fixed and small; the review recommends native links and a minimal pathname switch to avoid replacing one framework with another.
  Date/Author: 2026-08-31 / ChatGPT

- Decision: Pin `@cloudflare/vite-plugin` to `1.52.0` instead of upgrading the repository-pinned Wrangler solely for this migration.
  Rationale: `1.52.0` supports Wrangler `4.123.0`, minimizing operational dependency churn while retaining Vite 8 support.
  Date/Author: 2026-08-31 / ChatGPT

- Decision: Allow `script-src 'unsafe-inline'` only on Worker-served static pages when `LOCAL_ADMIN_BYPASS` or `LOCAL_SCREEN_BYPASS` is enabled.
  Rationale: Vite React Refresh injects an inline development preamble on those protected paths. Production vars remain `false`, so deployed CSP stays strict without weakening Access.
  Date/Author: 2026-08-31 / ChatGPT

## Outcomes & Retrospective

Implementation and validation are complete pending commit/push/PR creation.

`pnpm check` passes with zero lint warnings/errors and a clean TypeScript build. Worker Vitest passes 57/57 tests. `pnpm knip` is clean. React Doctor reports two non-blocking maintainability warnings in existing admin code (`no-many-boolean-props` in `JudgementModalView.tsx` and `no-giant-component` in `dashboard-page.tsx`); no migration-specific Doctor warnings remain.

`mise run cloudflare:check` builds the Worker and Vite client, verifies generated Wrangler types, completes Wrangler dry-run, checks the Free-plan bundle limit, and records a startup profile. The final dry-run reads 55 client assets; the Worker bundle is about 116.5 KiB / 27.9 KiB gzip, far below the configured 3 MiB compressed limit.

`agent-browser` verified direct load and reload for `/`, `/prizes`, `/screen`, `/admin`, `/admin/prizes`, and `/admin/prizes/new`. The public Settings dialog opens through native dialog semantics and closes with Escape. Admin number editing opens and closes without mutating data. Native public/admin links are exposed as links. A temporary heading edit on `/admin/prizes` appeared without reload and produced Vite `hot updated` console entries, confirming HMR; the temporary edit was reverted. No browser console errors were observed. React Aria emits existing non-fatal admin modal accessibility/overlay warnings that are outside this cutover's native public dialog path.

The pre-existing untracked `docs/code-review.md` remains unmodified and is not included in the commits. Draft PR: https://github.com/NUTFes/nutfes-Bingo/pull/386.

## Context and Orientation

The repository is a React 19 application currently structured as a Next.js App Router project under `src/app`. `next.config.ts` exports static HTML to `out/`. `scripts/cloudflare-dev.sh` and `Dockerfile.cloudflare` build those static assets and then run Wrangler. The Cloudflare Worker entry under `worker/` owns API routing, Cloudflare Access checks for `/admin`, Durable Object bindings, R2 access, Turnstile validation, and same-origin static assets. Public client features are under `src/features/user` and `src/components/user`; admin client features are under `src/features/admin` and `src/components/admin`.

The target architecture is a single Vite build/dev pipeline. `vite.config.ts` will combine React, Tailwind, and the Cloudflare Vite plugin. An HTML entry and React client bootstrap will render the correct route from `window.location.pathname`. Static metadata that does not require request-time computation will live in `index.html` or public files. Route-specific page titles may be set by the client bootstrap. Native `<a>` elements will handle fixed-path navigation. The Worker continues to protect admin paths and API calls exactly as before.

The custom image logic in `src/utils/cloudflare-image-loader.ts` currently relies on Next Image to generate responsive candidates. The migration must preserve meaningful `alt` text, intrinsic dimensions or aspect ratio, `srcset`, `sizes`, lazy/eager behavior, and fetch priority rather than degrading images to bare `src` attributes. The Rajdhani font currently supplied by `next/font` must remain self-hosted using existing local font assets and `@font-face`.

## Plan of Work

First, inspect the route files, root layouts, Worker entry, `wrangler.jsonc`, build scripts, image usages, fonts, API tests, and admin/public feature boundaries. Record any mismatch between the review document and current source before editing.

Second, make the low-risk deletions and bundle reductions while the Next.js build still exists. Delete unreachable admin login/auth-error UI and any UI component only used there. Remove `/api/health`, `/api/bingo/prizes`, hidden `peace`/`surprise` reaction variants, stale configuration files or overrides, and align README image size documentation with the 5 MiB enforced limit. Replace admin barrel imports with direct imports, replace React Aria `Virtualizer` usage with ordinary accessible `GridList` rendering, remove framer-motion layout animation, and replace react-icons usages with existing lucide-react icons.

Third, simplify client data flow. Remove build-time `initial*` props that are always empty, make typed API functions reject normally instead of wrapping into `ActionResult`, use typed prize creation inputs and keep FormData only inside the upload implementation, share validation constants and pure type guards without removing either client or server validation, convert the public modal to native `showModal()`/`close()` semantics, and convert navigation-shaped buttons to links.

Fourth, perform a clean Vite cutover. Add the Vite React, Cloudflare Vite, and Tailwind Vite plugins through repository-approved `mise run add -D` commands. Create the Vite configuration, HTML entry, client bootstrap, and any small route/meta utilities needed. Replace Next-specific `Image`, `Link`, `useRouter`, `dynamic`, `Script`, metadata, robots, sitemap, and font usages with the minimal equivalents described above. Ensure direct navigation and history behavior work for all fixed routes. Then remove Next.js, Next config/env files, Docker build path, old Cloudflare asset build/dev scripts, PostCSS-only configuration/dependencies, and obsolete generated assumptions.

Finally, validate from the outside in. Run all project checks required by `AGENTS.md`, build/start through the supported Cloudflare Vite path, and use `agent-browser` against the live local URL. Browser verification must include direct loads and reloads for each route, visible page content, native navigation, modal open/close/focus behavior, and admin page rendering when the local environment permits bypassing or satisfying Access. Any test that cannot be exercised because credentials or external Cloudflare resources are unavailable must be documented with the exact blocker and the closest local substitute.

## Concrete Steps

All commands run from `/home/tkymhrt/ghq/github.com/NUTFes/nutfes-Bingo`. Because `rtk` is not on PATH in DevSpace, invoke it as `/home/tkymhrt/.local/bin/rtk` for shell commands where it supports the underlying command.

Inspect relevant files with DevSpace `read` and read-only shell discovery. Use DevSpace `edit` for targeted edits and `write` for new files or complete rewrites. Do not use shell redirection or scripts to modify repository files.

Add dependencies only through the repository wrappers, for example:

    mise run add -D vite @vitejs/plugin-react @cloudflare/vite-plugin @tailwindcss/vite

Remove dependencies only through the wrapper, for example:

    mise run remove next framer-motion react-icons postcss-load-config

The exact set will be finalized after source inspection so dependencies that remain transitively or operationally required are not removed prematurely.

Validation commands expected at the end are:

    pnpm fmt:check
    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm doctor
    pnpm knip
    mise run cloudflare:check

The Vite/Cloudflare build and dev commands will be taken from the final `mise.toml` and package scripts after the cutover. The development server will then be exercised with `agent-browser` using a worktree-scoped session.

## Validation and Acceptance

The branch is accepted when formatting, linting, typechecking, Worker tests, React Doctor, knip, and relevant Cloudflare validation all succeed; when the production/static asset build succeeds without Next.js; and when browser testing confirms the five fixed routes render after direct navigation and reload. `/` must show the bingo user view, `/prizes` the public prize view, `/screen` the display view, `/admin` the admin dashboard, and `/admin/prizes` the admin prize view. Public navigation must use real links. The public dialog must enter the browser modal top layer through `showModal()` and close through native close/cancel semantics without the previous hand-written focus trap. Responsive images must expose `srcset` and `sizes` where they did before.

Worker API acceptance includes retaining `/api/ready` while `/api/health` is absent, removing the redundant `/api/bingo/prizes` view, and preserving authoritative `/api/bingo/state`. Only publicly sendable reaction variants remain accepted and rendered. Access and Turnstile server-side validation remain covered by Worker tests.

## Idempotence and Recovery

All source edits are version-controlled and can be retried. Dependency commands are lockfile-aware and are safe to rerun if the declared package state already matches. The Vite cutover is intentionally clean rather than dual-running Next and Vite; if a milestone fails before the clean cutover is complete, use `git diff` to isolate the failing edits and fix forward on the feature branch. Do not reset or overwrite the pre-existing untracked `docs/code-review.md`.

If the local browser cannot access an admin route because Cloudflare Access credentials are unavailable, retain Worker tests for Access enforcement and browser-test the public routes plus any locally configured admin bypass already supported by the repository. Do not weaken Access solely for testing.

## Artifacts and Notes

Starting state:

    ## develop...origin/develop
    ?? docs/code-review.md

Base synchronization before branch creation:

    git rev-list --left-right --count develop...origin/develop
    0  0

Feature branch:

    refactor/cloudflare-vite-clean-cutover

## Interfaces and Dependencies

The final frontend runtime must depend on React 19, React DOM, Vite, `@vitejs/plugin-react`, `@cloudflare/vite-plugin`, and `@tailwindcss/vite`. It must not depend on Next.js, React Router, or another full-stack React framework. Cloudflare runtime dependencies such as `jose`, React Aria, matter-js, and driver.js remain unless source inspection proves an item unused.

The client entry should expose no request-time server interface. It should select one of the fixed page components from `window.location.pathname` and render it with `createRoot`. Any responsive image component must accept at least image source, `alt`, width/height or aspect ratio, `sizes`, loading priority, and class/style passthrough sufficient for all existing usages, then generate Cloudflare transformation `srcset` candidates using the existing URL transformation logic.

The Worker remains the authority for dynamic state and continues to expose same-origin APIs and assets. Admin authorization remains enforced before protected assets or `/admin/api/*` handlers are served.
