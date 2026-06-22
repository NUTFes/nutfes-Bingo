# ADR-0002: CloudflaredでNext.jsとSupabase Kongを別hostnameへ直接公開する

## Status

Accepted

## Context

ADR-0001では、本番公開経路をProxmox LXC + Cloudflaredに固定した。ただし、その時点ではCaddyをCompose内に残し、CloudflaredからCaddyへ接続し、CaddyがNext.jsとSupabase Authへ振り分ける構成だった。

Cloudflare Tunnelは複数のpublic hostnameを別々のorigin serviceへ転送できる。Supabase self-hosted stackはKongをAPI Gatewayとして置き、`/auth/v1`、`/rest/v1`、`/storage/v1` などを同一Supabase URL配下で公開する構成を前提にしている。Caddyを挟んで `https://app.example.com/supabase/*` へpath proxyするより、`https://app.example.com` と `https://supabase.example.com` を分ける方が、CloudflaredとSupabaseの標準的な考え方に近い。

ローカル開発でもCaddyが `https://nutfes-bingo.localhost` と `/supabase` prefix proxyを担っていたが、Next.jsは `http://localhost:3000`、Supabase CLI stackは `http://localhost:54321` で直接利用できる。ローカルHTTPSと同一origin化のためだけにCaddyを維持すると、年1運用で理解すべきmoduleが増える。

## Decision

本番Composeとローカル開発ComposeからCaddyを削除する。

本番はCloudflaredから次の2つのhostnameを直接転送する。

- `https://app.example.com` -> `http://app:3000`
- `https://supabase.example.com` -> `http://kong:8000`

Supabase Studioは通常起動しない。必要になった場合だけ、Cloudflare Accessで保護した別hostnameを追加する。

ローカル開発は次のURLを標準とする。

- Next.js: `http://localhost:3000`
- Supabase API Gateway: `http://localhost:54321`

Next.jsのbrowser向けSupabase URLは `NEXT_PUBLIC_SUPABASE_URL`、Supabase stack自身の公開URLは `SUPABASE_PUBLIC_URL` とし、productionでは同じ `https://supabase.example.com` に揃える。Next.js server-sideからSupabaseへ接続する内部URLは `SUPABASE_SERVER_URL=http://kong:8000` を使う。

## Consequences

Caddyfile、Caddy container、Caddy volume、ローカルCA証明書手順が不要になる。Cloudflare Dashboard側ではPublic Hostnameを2つ設定する必要がある。preflightとsmoke testは、app URLとSupabase URLを別々に検査する。

`/rest/v1` と `/storage/v1` はSupabase Kong経由で到達可能になる。ただし、このアプリではpublic browserが直接DBを読む設計にしない。公開されるSupabase APIは、RLS、PostgREST権限、Storage policy、API keyで守る。現行migrationはpublic schemaのanon/authenticated権限を絞っているため、公開Gatewayを置いてもNext.js server-sideのsecret key経由を主経路にできる。

ローカル開発はHTTPになるため、HTTPS前提の問題は本番前smokeで確認する。Auth redirect URLは `http://localhost:3000` と `https://app.example.com` をそれぞれ設定する。

## Supersedes / Amends

Amends ADR-0001. Proxmox LXC + Cloudflared固定は維持し、Caddy経由の単一hostname/path proxyを廃止する。

ADR-0004でsupersedeされた。Caddy廃止は維持するが、Supabase Kongを別hostnameへ直接公開する判断は取り消し、公開境界をNext.jsだけにする。
