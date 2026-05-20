# ADR-002: 本番公開はCloudflare Tunnelと内部CaddyでNext.jsとself-hosted Supabaseを同一オリジン化する

## Status

Accepted

## Date

2026-05-20

## Context

nutfes-Bingo は Docker での開発と本番公開を想定している。本番では self-hosted Supabase も Docker 内で運用し、外部公開は Cloudflare Tunnel 経由にする。公開ユーザーはビンゴ当日に同時接続するため、アプリ公開口、Supabase API公開口、TLS終端、Docker network の境界を明確にする必要がある。

既存の `compose.dev.yml` と `Caddyfile` はローカル開発用であり、`nutfes-bingo.localhost`、`tls internal`、ホストの 80/443 公開を使う。本番にそのまま使うと、Cloudflare Tunnel とホストポート公開が二重の入口になり、運用と障害切り分けが難しくなる。

## Decision Drivers

- Cloudflare Tunnel を唯一の外部公開入口にすること
- ブラウザから Next.js と Supabase API を同一オリジンで扱えること
- Next.js サーバーから Supabase への通信は Docker 内部で完結すること
- ローカル開発用 HTTPS 構成を壊さないこと
- 本番Docker image は Next.js standalone 出力で小さく保つこと

## Options Considered

### Option 1: Cloudflare TunnelからNext.jsだけを公開し、Supabaseは別ドメインで公開する

Pros:

- Caddy のパスルーティングが不要になる。
- Next.js と Supabase の責務がホスト名で分かれる。

Cons:

- ブラウザから見るオリジンが分かれ、CORS、Cookie、Auth callback、Storage URL の運用が複雑になる。
- 既存の `NEXT_PUBLIC_SUPABASE_URL=https://.../supabase` 前提を変える必要がある。

### Option 2: Cloudflare Tunnelから内部Caddyを公開し、CaddyがNext.jsとSupabase Kongへ振り分ける

Pros:

- ブラウザは単一オリジンで `/` と `/supabase/*` を扱える。
- Cloudflare Tunnel を唯一の外部公開口にできる。
- Caddy は内部HTTPのパスルーターに限定でき、本番でローカルCAやホスト 80/443 公開が不要になる。
- Next.js サーバーは `SUPABASE_SERVER_URL=http://caddy:8080/supabase` で Docker 内部通信できる。

Cons:

- Caddy コンテナが本番経路上の追加コンポーネントになる。
- Supabase Kong の service 名や Docker network 名を本番環境に合わせて設定する必要がある。

### Option 3: Cloudflare Tunnelの複数public hostname/path設定だけでNext.jsとSupabaseを直接振り分ける

Pros:

- Caddy コンテナを削除できる。
- Cloudflare 側にルーティング設定を集約できる。

Cons:

- ルーティングの重要設定がGit管理外になりやすい。
- ローカル再現性が落ちる。
- Cloudflare設定を誤るとアプリとSupabaseの片方だけが壊れ、差分レビューしにくい。

## Decision

本番公開は Option 2 を採用する。Cloudflare Tunnel は Docker 内部の Caddy `http://caddy:8080` へ転送する。Caddy は `/supabase/*` を Supabase Kong へ、それ以外を Next.js app へ転送する。本番Caddyは TLS 終端を行わず、Cloudflare が外部TLSを終端する。

ブラウザ用の `NEXT_PUBLIC_SUPABASE_URL` は `https://<公開ドメイン>/supabase` にする。サーバー用には `SUPABASE_SERVER_URL` を追加し、本番では `http://caddy:8080/supabase` を使う。

## Rationale

このアプリは公開画面で高頻度のHTTPポーリングを使うため、外部公開経路を単純にしておく必要がある。Cloudflare Tunnel を唯一の入口にすれば、ホストの 80/443 を公開せずに済み、TLS と公開制御を Cloudflare に寄せられる。

Caddy は本番で必須のTLSサーバーではない。しかし、同一オリジンの `/supabase/*` をGit管理された設定で安定して提供するには、内部リバースプロキシとして残す価値がある。Cloudflare のダッシュボードだけでパスルーティングするより、`Caddyfile.prod` としてレビューできる方が当日運用で安全である。

## Consequences

### Positive

- 本番Composeは host port を公開せず、Cloudflare Tunnel だけが外部入口になる。
- Next.js と Supabase API を同一オリジンで公開できる。
- サーバー側 Supabase 通信は Docker 内部で完結し、Cloudflare を往復しない。
- 開発用Caddyと本番用Caddyの役割が分離される。

### Negative

- Caddy が本番経路上に残るため、Caddy設定の監視と検証が必要になる。
- Supabase self-hosted 側の Docker network 名と Kong service 名を環境ごとに正しく指定する必要がある。

### Neutral / Trade-offs

- Cloudflare Tunnel の public hostname 設定は Cloudflare 側にも必要である。Gitには `compose.prod.yml` と `README.md` で期待値を記録する。
- Supabase Studio はこの構成では公開しない。必要な場合は別の認証付き経路を設計する。

## Implementation Notes

- `Dockerfile` は Next.js standalone 出力を使う。
- `compose.prod.yml` は `app`、`caddy`、`cloudflared` を定義し、host `ports` は使わない。
- `Caddyfile.prod` は `:8080` で待ち受け、`tls internal` は使わない。
- `NEXT_PUBLIC_SUPABASE_URL` は公開URL、`SUPABASE_SERVER_URL` はサーバー内部URLとして扱う。
- `/api/bingo/*` は公開ポーリングAPIなので、Supabase Auth proxy の高頻度チェック対象から外す。
- Docker image build はDB起動状態に依存させないため、`pnpm build` は `NUTFES_SKIP_SUPABASE_FETCH=1 next build` として実行する。実行時にはこの環境変数を設定しない。

## Validation

- [x] `pnpm fmt`
- [x] `pnpm lint`
- [x] `pnpm build`
- [x] `docker compose -f compose.prod.yml --env-file .env.production.example config`
- [ ] 本番環境で `/api/health` が HTTP 200 を返すこと
- [ ] 本番環境で `/supabase/rest/v1/` が Supabase Kong から応答すること

## Related

- Related ADR: `docs/adr/ADR-001-replace-public-realtime-websocket-with-short-polling.md`
- 実装計画: `docs/exec-plans/2026-05-20-production-docker-cloudflare-tunnel.md`
