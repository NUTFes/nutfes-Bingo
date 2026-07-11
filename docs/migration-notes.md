# Migration notes

## Cutover

This branch is a clean Cloudflare-native cutover. It intentionally provides no compatibility layer for the previous runtime, API routes, database schema, sessions, or production procedures.

## Removed

- Next.js server runtime, SSR, Server Components, Server Actions, BFF routes, `next/cache`, and `next/headers`
- ETag polling endpoints and polling hooks
- Supabase Auth, client libraries, CLI, migrations, generated database types, Storage, PostgREST, service role credentials, and profile-based authorization
- Self-hosted PostgreSQL and all database bootstrap scripts
- Kong, GoTrue, Storage API, and related configuration
- Development and production Dockerfiles / Compose files
- Proxmox LXC scripts, backup/restore scripts, and annual container operations
- Cloudflare Tunnel configuration and token handling
- Supabase and container CI workflows
- Supabase-specific local agent skills and maintenance templates

## Added

- React SPA built by Vite and served by Workers Static Assets
- Cloudflare Worker HTTP API
- SQLite-backed `BingoRoom` and sharded `ReactionRoom` Durable Objects
- WebSocket Hibernation API with snapshot/delta version protocol
- Signed participant cookie and reach deduplication
- Cloudflare Access JWT verification on every admin API call
- Private R2 image lifecycle with size/MIME/signature validation
- Unit, integration, WebSocket, R2, and guarded 1,000-connection load tests
- Cloudflare-native CI/CD and production approval environment
- Event-day degradation flags and operations documentation

## Data migration

No old database import is supplied or required. The event is initialized as an empty Durable Object state. If historical records must be preserved, archive them outside this application before cutover.

The Worker uses the configured `EVENT_ID` to select `bingo-room:<eventId>`. Changing `EVENT_ID` creates a new logical event object without deleting the previous object.

## API compatibility

Old `/api/bingo/state`, `/api/bingo/screen`, `/api/bingo/stamps`, and polling response types were removed. Current public endpoints are:

- `GET /api/session`
- `GET /api/state` (manual fallback only)
- `GET /api/ws` (WebSocket)
- `GET /api/reactions/ws` (WebSocket)
- `POST /api/reach`
- `GET /api/prize-images/*`

Admin operations use `/api/admin/*` and are not compatible with prior Server Actions.

## Operational migration

There is no origin host, exposed database, tunnel daemon, or container lifecycle. Operations move to:

- Wrangler and the Cloudflare dashboard for deploy/logs/metrics;
- Access for administrator identity and policies;
- Durable Object SQLite/PITR for state;
- R2 for prize images;
- GitHub Environment approval for production deployment.

Before DNS cutover, complete every human action in `README.md` and `docs/operations.md`, especially real origins, Access policies, R2 bucket creation, secrets, GitHub environment variables, and an approved preview load test.
