# 本番Docker構成をCloudflare Tunnelとself-hosted Supabase前提に整える

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

このリポジトリには `PLANS.md` は存在しない。この文書は `/home/tkymhrt/.agents/skills/execplan/references/PLANS.md` の方法論に従い、単独で読んでも実装できるように必要な前提を本文へ含める。

## Purpose / Big Picture

本番では Next.js アプリと self-hosted Supabase を Docker 内で動かし、外部公開は Cloudflare Tunnel だけに任せる。完了後は、ホストの 80/443 を直接公開せず、Cloudflare Tunnel が Docker 内部の Caddy へ到達し、Caddy が `/` を Next.js、`/supabase/*` を Supabase Kong へ振り分ける構成を起動できる。開発用の HTTPS Caddy 構成は残しつつ、本番では Caddy を TLS 終端ではなく内部リバースプロキシとして使う。

## Progress

- [x] (2026-05-20 00:00 JST) 既存の `README.md`、`compose.dev.yml`、`Caddyfile`、Next.js/Supabase client 設定を確認した。
- [x] (2026-05-20 00:00 JST) 本番構成では Cloudflare Tunnel を唯一の公開入口にし、Caddy は内部パスルーターとして残す方針を決めた。
- [x] (2026-05-20 00:00 JST) 本番用 Dockerfile、Compose、Caddyfile、環境変数例、ヘルスチェック、ドキュメント、ADR を追加する。
- [x] (2026-05-20 00:00 JST) 公開ポーリングAPIが毎回 Supabase Auth proxy を通らないようにする。
- [x] (2026-05-20 00:00 JST) `pnpm fmt`、`pnpm lint`、`pnpm build` で検証する。
- [x] (2026-05-20 00:00 JST) `docker compose -f compose.prod.yml --env-file .env.production.example config` で本番Composeの構文を検証する。

## Surprises & Discoveries

- Observation: 既存の `compose.dev.yml` は Caddy がホストの 80/443 を公開し、`tls internal` を使うローカル開発専用の構成だった。
  Evidence: `compose.dev.yml` は `ports: "80:80", "443:443"` を持ち、`Caddyfile` は `nutfes-bingo.localhost { tls internal ... }` だった。

- Observation: `proxy.ts` の matcher は `/api/bingo/*` も対象にしており、protected path でないリクエストでも `supabase.auth.getClaims()` を呼んでいた。
  Evidence: `src/lib/supabase/proxy.ts` は `isProtectedPath` の判定より前に Supabase client を作成し `getClaims()` を実行していた。

- Observation: Next.js の standalone 出力は有効だが、それを実行する本番用 Dockerfile は存在しなかった。
  Evidence: `next.config.ts` に `output: "standalone"` はあるが、リポジトリには `dev.Dockerfile` しか存在しなかった。

- Observation: `next build` は Partial Prerender の静的シェル生成中に Supabase へ到達しようとし、Supabase が起動していない環境では fetch error を出した。
  Evidence: 初回の `pnpm run build` は exit code 0 だったが、`景品一覧の取得に失敗しました: TypeError: fetch failed` などのログを出した。`NUTFES_SKIP_SUPABASE_FETCH=1 next build` に変更後、同じbuildはエラーなしで成功した。

## Decision Log

- Decision: 本番では Cloudflare Tunnel を唯一の外部公開口にし、Compose ではホストポートを公開しない。
  Rationale: Cloudflare Tunnel 経由の公開を前提にするなら、ホストの 80/443 を開ける必要がない。公開入口を1つにすると、TLS、アクセスログ、障害切り分け、ファイアウォール設計が単純になる。
  Date/Author: 2026-05-20 / Codex

- Decision: Caddy は本番でも残すが、TLS 終端ではなく Docker 内部の HTTP リバースプロキシとして使う。
  Rationale: Next.js と Supabase を同一オリジンの `/supabase/*` に束ねる必要がある。Cloudflare が外部TLSを終端するため、本番Caddyで `tls internal` は使わない。
  Date/Author: 2026-05-20 / Codex

- Decision: ブラウザ用 Supabase URL とサーバー用 Supabase URL を分離する。
  Rationale: ブラウザは Cloudflare 上の公開URLを使う必要がある一方、Next.js サーバーは Docker 内部の Caddy 経由で Supabase Kong に到達すべきである。公開インターネットを往復しないため、レイテンシと障害面が改善する。
  Date/Author: 2026-05-20 / Codex

- Decision: 公開ポーリングAPIは Supabase Auth proxy の対象外にする。
  Rationale: `/api/bingo/*` は匿名参加者が高頻度で読む公開APIであり、管理者認証の更新処理を毎回実行する必要がない。管理者保護は `/admin` と `/auth` 系だけで行う。
  Date/Author: 2026-05-20 / Codex

- Decision: production build では `NUTFES_SKIP_SUPABASE_FETCH=1` を設定し、Supabase データ取得を空データへフォールバックする。
  Rationale: Docker image build はDB稼働状態に依存させない。実行時にはこの環境変数を設定しないため、Next.js サーバーは `SUPABASE_SERVER_URL` で通常どおり Supabase へ接続する。
  Date/Author: 2026-05-20 / Codex

## Outcomes & Retrospective

本番用の Dockerfile、`compose.prod.yml`、`Caddyfile.prod`、`.env.production.example` を追加し、Cloudflare Tunnel が Caddy へ、Caddy が Next.js と Supabase Kong へ振り分ける構成を明文化した。`SUPABASE_SERVER_URL` によりサーバー側の Supabase 通信は Docker 内部に閉じ、公開ポーリングAPIは認証proxyを避ける。`pnpm fmt`、`pnpm lint`、`pnpm build`、`docker compose -f compose.prod.yml --env-file .env.production.example config` は成功した。

## Context and Orientation

このアプリは Next.js App Router と Supabase を使う。公開ユーザーは `/`、`/prizes`、`/screen` を開き、ブラウザは `/api/bingo/*` を短い間隔で読む。管理者は `/admin` を使う。Supabase は Auth、Postgres REST、Storage を提供し、ブラウザからは `NEXT_PUBLIC_SUPABASE_URL` で指定した同一オリジンの `/supabase/*` にアクセスする。

Cloudflare Tunnel とは、サーバー側で動く `cloudflared` コンテナが Cloudflare へアウトバウンド接続を張り、Cloudflare 側の公開ホスト名へのアクセスをその接続経由で内部サービスへ転送する仕組みである。この構成では、サーバーの 80/443 ポートを外部に開けない。

Caddy はリバースプロキシである。リバースプロキシとは、ブラウザから見える1つの入口の裏側で、パスやホスト名に応じて別のサービスへリクエストを転送するサーバーを指す。この計画では、本番Caddyは `:8080` の内部HTTPだけを待ち受け、`/supabase/*` を Supabase Kong、その他を Next.js app へ送る。

## Plan of Work

まず `Dockerfile` を追加し、Next.js の standalone 出力を使う本番イメージを作る。builder stage では `pnpm run build` を実行し、runner stage では `.next/standalone`、`.next/static`、`public` だけをコピーし、非rootユーザーで `node server.js` を起動する。

次に `Caddyfile.prod` を追加する。これは `:8080` で待ち受け、`/supabase/*` を `SUPABASE_KONG_HOST` と `SUPABASE_KONG_PORT` へ `handle_path` で転送し、それ以外を `app:3000` へ転送する。`handle_path` はマッチした接頭辞を取り除いて upstream へ送るため、`/supabase/rest/v1/...` は Supabase Kong には `/rest/v1/...` として届く。

次に `compose.prod.yml` を追加する。`app`、`caddy`、`cloudflared` の3サービスを定義する。`app` と `caddy` は内部 network に参加し、`caddy` は self-hosted Supabase の Docker network にも参加する。`cloudflared` は内部 network から `http://caddy:8080` に到達する。Compose では host port を公開しない。

次に Supabase URL の分離を行う。`src/lib/supabase/server.ts`、`src/lib/supabase/proxy.ts`、`src/lib/queries.ts` は `SUPABASE_SERVER_URL` があればそれを使い、なければ `NEXT_PUBLIC_SUPABASE_URL` に戻る。ブラウザclientと画像URL生成は引き続き `NEXT_PUBLIC_SUPABASE_URL` を使う。

最後にドキュメントと判断記録を更新する。`README.md` に本番起動手順と Cloudflare 側の public hostname 設定を追加し、`docs/adr/` に本番公開方式のADRを追加する。

## Concrete Steps

作業ディレクトリは `/home/tkymhrt/ghq/github.com/NUTFes/nutfes-Bingo` とする。

1. `Dockerfile`、`Caddyfile.prod`、`compose.prod.yml`、`.env.production.example` を追加する。
2. `src/lib/supabase/server.ts`、`src/lib/supabase/proxy.ts`、`src/lib/queries.ts`、`src/utils/utils.ts` を更新し、サーバー用Supabase URLを分離する。
3. `src/lib/supabase/proxy.ts` を更新し、`/api/bingo/*` などの公開パスで Supabase Auth 確認を実行しない。
4. `src/app/api/health/route.ts` を追加し、Docker healthcheck が Next.js の起動を確認できるようにする。
5. `package.json` の `build` script を `NUTFES_SKIP_SUPABASE_FETCH=1 next build` に変更し、Docker image build がDB起動状態に依存しないようにする。
6. `README.md` とADRを更新する。
7. `pnpm fmt`、`pnpm lint`、`pnpm build`、`docker compose -f compose.prod.yml --env-file .env.production.example config` を実行する。

## Validation and Acceptance

静的検証として `pnpm fmt`、`pnpm lint`、`pnpm build` が成功することを確認する。Docker構成の構文確認として `docker compose -f compose.prod.yml --env-file .env.production.example config` が成功することを確認する。実際の本番起動では、Cloudflare Zero Trust 側で tunnel の public hostname の service を `http://caddy:8080` に設定し、`docker compose -f compose.prod.yml --env-file .env.production up -d --build` を実行する。公開URLの `/api/health` が `{"ok":true}` を返し、`/supabase/rest/v1/` が Supabase Kong から応答すればネットワーク経路は成立している。

## Idempotence and Recovery

追加する本番ファイルは開発用 `compose.dev.yml` と `Caddyfile` を変更せずに併存するため、ローカル開発は従来どおり継続できる。`compose.prod.yml` は host port を公開しないため、起動に失敗しても外部公開状態を変えにくい。Cloudflare Tunnel の token が間違っている場合は `cloudflared` だけが再起動し続けるため、`.env.production` の値を直して `docker compose -f compose.prod.yml up -d cloudflared` を再実行する。

## Artifacts and Notes

本番構成の入口は `compose.prod.yml` である。Cloudflare Tunnel の公開先は Caddy であり、Caddy の upstream は Next.js app と Supabase Kong である。

    internet -> Cloudflare -> cloudflared -> caddy:8080
                                      ├─ /supabase/* -> supabase kong:8000
                                      └─ /*           -> app:3000

## Interfaces and Dependencies

`SUPABASE_SERVER_URL` はサーバー専用の任意環境変数である。設定されている場合、Server Components、Route Handlers、Server Actions、auth proxy はこのURLで Supabase に接続する。設定されていない場合は既存互換のため `NEXT_PUBLIC_SUPABASE_URL` を使う。

`NEXT_PUBLIC_SUPABASE_URL` はブラウザに公開されるURLである。本番では `https://<公開ドメイン>/supabase` にする。これは Next.js build 時にも必要であり、`next.config.ts` の画像remotePatternsにも使われる。

Revision note 2026-05-20: 初版を作成した。Cloudflare Tunnel + self-hosted Supabase + Docker 本番公開の前提に合わせ、Caddyの役割、外部公開境界、環境変数分離、検証方法を記録した。

Revision note 2026-05-20: 実装と検証結果を反映した。production build が Supabase 起動状態に依存しないよう `NUTFES_SKIP_SUPABASE_FETCH=1` を使う判断と、`pnpm fmt`、`pnpm lint`、`pnpm build`、Compose config の成功を追記した。
