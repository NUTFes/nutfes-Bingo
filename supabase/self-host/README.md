# Supabase self-hosted stack

This directory manages the production-like self-hosted Supabase stack for nutfes-Bingo.

The official Supabase Docker files are not hand-edited in this repository. Run the sync task to download a pinned copy into `supabase/self-host/upstream/`, then layer `compose.override.yml` on top for this app's network aliases and local-only database/pooler host ports.

## Files

- `UPSTREAM_REF` — pinned Supabase repository ref used by the sync script.
- `upstream/` — generated official `supabase/supabase/docker` directory. Ignored by git.
- `.env.local` — generated local/staging secrets. Ignored by git.
- `compose.override.yml` — NUTFes network/alias and host-port hardening override.

## Quick start

```bash
mise run supabase:selfhost:sync
mise run supabase:selfhost:init-env
mise run prod:init-env
mise run supabase:selfhost:config
mise run supabase:selfhost:up
mise run supabase:selfhost:health
mise run supabase:selfhost:db-apply
```

`prod:init-env` copies the generated Supabase values into the ignored
`.env.production.local` file:

```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<SUPABASE_PUBLISHABLE_KEY>
SUPABASE_SECRET_KEY=<SUPABASE_SECRET_KEY>
SUPABASE_SERVER_URL=http://supabase_kong_nutfes-Bingo:8000
SUPABASE_UPSTREAM=supabase_kong_nutfes-Bingo:8000
SUPABASE_DOCKER_NETWORK=supabase_network_nutfes-Bingo
```

Do not commit `.env.local` or real keys.

`upstream/` is pinned by `UPSTREAM_REF`. Before changing the pinned ref, check the
official Supabase self-hosting docs and changelog because upstream Compose
environment contracts can change.
