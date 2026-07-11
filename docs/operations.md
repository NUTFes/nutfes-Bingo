# Operations

## Before first production deployment

1. Create or select the Cloudflare account and zone.
2. Create private R2 buckets:
   - `nutfes-bingo-images-preview`
   - `nutfes-bingo-images-production`
3. Replace `PUBLIC_ORIGIN` placeholders in `wrangler.jsonc` with the actual preview and production origins.
4. Create a Cloudflare Access self-hosted application covering:
   - `/admin/*`
   - `/api/admin/*`
5. Add an Allow policy for the small administrator group. Do not use a bypass policy in production.
6. Store `COOKIE_SIGNING_SECRET`, `ACCESS_AUD`, and `ACCESS_TEAM_DOMAIN` with `wrangler secret put --env production`.
7. Create GitHub Environment `production`, enable required reviewers, and add:
   - secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `COOKIE_SIGNING_SECRET`, `ACCESS_AUD`, `ACCESS_TEAM_DOMAIN`
   - variable: `PRODUCTION_URL`
8. Restrict the API token to the target account with Workers Scripts edit, Workers R2 Storage edit, and the minimum account/zone read permissions required by Wrangler. Do not use a Global API Key.
9. Deploy once. Wrangler applies the `v1` SQLite Durable Object migration.
10. Confirm the R2 bucket does not expose an `r2.dev` public URL.

## Pre-event checklist

### One to four weeks before

```bash
mise install
mise run install
pnpm check
pnpm build:production
pnpm exec wrangler deploy --dry-run
```

- Confirm Cloudflare Free plan limits and product pricing have not changed.
- Confirm `EVENT_ID` is the intended year/event identifier.
- Confirm `REACTION_SHARDS=4` or the selected tested shard count.
- Confirm Access application `AUD` still matches the Worker secret.
- Confirm team domain and Access JWKS endpoint are reachable.
- Rotate `COOKIE_SIGNING_SECRET` only before the event; rotation invalidates participant reach/reaction identities.
- Upload representative JPEG, PNG, and WebP files; reject a >2 MiB file and mismatched MIME/signature.
- Verify number add/update/delete/reset, reach controls, survey, prize lifecycle, all feature flags, and event initialization.
- Run the 1,000-connection load test against local or an explicitly approved preview target. Never target production without written authorization.

### Event-day preflight

1. Open `/admin` through Access in a private browser.
2. Open `/screen` on the venue display.
3. Open `/` on a participant device and `/prizes` in a second tab.
4. Use **Initialize event** and type `RESET`. This removes numbers, reaches, prizes, prize images, survey state, rate limits, and reaction budgets.
5. Confirm flags:
   - `reactionsEnabled=true`
   - `reachSubmissionEnabled=true`
   - `surveyEnabled=true`
   - `adminWritesEnabled=true`
   - `readOnlyMode=false`
6. Add and remove one test number. Confirm participant and venue update without reload.
7. Submit one reach and reaction. Confirm venue count/animation.
8. Confirm Worker, Durable Object, and R2 dashboards show no errors.
9. Reset test data again before admitting participants.

## Start of event

- Keep one admin tab and one read-only participant tab on separate devices/networks.
- Keep venue status indicators green for Bingo and Reactions.
- Record starting version from **Current state**.
- Do not refresh all clients simultaneously unless recovery requires it.

## During event

### Normal drawing

- Use number add for each draw.
- Correct mistakes with number update; delete only the selected row.
- Avoid full reset after the event starts.
- Monitor Worker request count, Durable Object requests/duration/SQLite rows, and error logs.

### Survey

- Save an HTTPS URL only.
- Publish when ready; stop after collection.
- `surveyEnabled=false` is the degradation switch and overrides the stored active state.

### Prize operation

- Images must be JPEG, PNG, or WebP and no larger than 2 MiB.
- Mark awarded prizes as won instead of deleting them when the history matters.
- Reorder with up/down controls; order is deterministic across clients.

## Degradation procedure

Protect features in this order: number display, number administration, venue display, reach, survey, reactions.

1. **Reaction pressure or errors**: set `reactionsEnabled=false`. This propagates to every ReactionRoom shard. BingoRoom is unaffected.
2. **Survey issue**: set `surveyEnabled=false`.
3. **Reach pressure**: set `reachSubmissionEnabled=false`. Admin reach controls remain available.
4. **Unsafe writes or broad incident**: set `readOnlyMode=true`. Existing SQLite state, snapshots, static assets, and connected readers remain available; all non-flag writes are rejected.
5. If admin writes alone must stop while readers continue, set `adminWritesEnabled=false`.

Do not disable `adminWritesEnabled` and then navigate away before deciding whether it must be re-enabled; flag updates remain intentionally allowed so recovery is possible.

## Connectivity incident

- Clients reconnect automatically with exponential backoff and jitter.
- A connected client keeps its last snapshot and shows offline state.
- Use the **Resync** button for a one-time `GET /api/state`; there is no automatic HTTP polling.
- If only reaction status is red, continue number drawing and disable reactions.
- If Bingo status is red, stop number mutation until at least admin and venue have resynchronized.
- Check Workers Logs for structured `request.failed` entries and Durable Object metrics.

## Free-tier limit approach

- Reaction shards stop automatically after 4,000 accepted reactions each (16,000 total with four shards).
- Disable reactions earlier when Durable Object requests approach 70% of the daily allowance.
- At 80% of any critical daily limit, disable reach submissions and survey if they contribute traffic.
- Preserve number reads/writes until the event ends.
- Free-plan overage does not bill silently; operations of the exceeded type fail. Treat dashboard warnings as an incident before that point.

## End of event

1. Set `reactionsEnabled=false` and stop the survey.
2. Expand **Current state** and save the JSON to the approved event archive if retention is required.
3. Download required prize source images separately; there is no public bucket listing/export endpoint.
4. Record final version, number sequence, reach count, and awarded prizes.
5. Review Worker and Durable Object errors and usage.
6. Use **Initialize event** only after archival approval. It deletes prize metadata and R2 objects.
7. Confirm `/api/state` returns an empty number/prize list and zero reach count.

## Rollback

- Worker code: use `wrangler versions list` then `wrangler rollback <VERSION_ID>`.
- SQLite data: use Durable Objects Point-in-Time Recovery through the supported Cloudflare procedure before event initialization if state recovery is required.
- Do not roll back to the removed server/database architecture; it has no compatible schema or runtime.
- A code rollback does not automatically roll back R2 objects or SQLite data. Verify protocol/schema compatibility before rollback.
