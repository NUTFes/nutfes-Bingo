# 公開境界をNext.jsだけにする

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

この文書は `/home/tkymhrt/.agents/skills/execplan/references/PLANS.md` の形式に従って管理する。このリポジトリには `AGENTS.md` があり、大きな実装や実験では `docs/exec-plans/` に日本語のExecPlanを作成または更新するよう定めている。

## Purpose / Big Picture

この変更の目的は、技大祭当日に公開する入口をNext.jsだけに絞り、後任がCloudflare Tunnelの公開先を1つだけ設定すればよい状態にすることである。作業後、利用者のブラウザはSupabase Auth、PostgREST、Storage、S3互換APIを直接呼ばず、ログイン、公開画面データ、景品画像、管理操作のすべてがNext.jsの画面、Server Action、`/api/*` routeを通る。確認方法は、`mise run prod:config` でCloudflaredが `app` だけへ接続することを見て、`mise run prod:smoke` でNext.jsのhealth、ready、BFF APIだけを叩くことである。

ここでいうBFFとはBackend for Frontendの略で、ブラウザのためにNext.jsが公開HTTP APIを提供し、裏側のSupabaseやStorageとの通信を隠す構成を指す。このリポジトリでは `src/app/api/bingo/*`、`src/app/api/prize-images/[...path]/route.ts`、`src/features/admin/auth/actions.ts` がBFFの入口になる。

## Progress

- [x] (2026-06-23 01:31 UTC+8) 依頼内容、README、既存ADR、既存ExecPlan、Next.js 16.2.6のローカルdocsを読み、現状はSupabase別hostname公開とブラウザSupabase auth clientが残っていることを確認した。
- [x] (2026-06-23 01:31 UTC+8) ADR-0004を追加し、ADR-0002のSupabase別hostname公開判断をsupersedeした。
- [x] (2026-06-23 01:31 UTC+8) 認証フォームをブラウザSupabase clientからServer Actionへ移し、`src/lib/supabase/client.ts` を削除した。
- [x] (2026-06-23 01:31 UTC+8) Next.js server-side Supabase clientを `SUPABASE_SERVER_URL` と `SUPABASE_PUBLISHABLE_KEY` に切り替え、`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` をコードとComposeから除去した。
- [x] (2026-06-23 01:31 UTC+8) 景品画像routeをStorage public object fetchからservice role clientのdownloadへ切り替えた。
- [x] (2026-06-23 01:31 UTC+8) Compose、Dockerfile、mise task、preflight、smoke test、CI、env exampleをNext.jsだけ公開する構成へ更新した。
- [x] (2026-06-23 01:31 UTC+8) READMEをCloudflare Public Hostname 1つ、Supabase内部URL、BFF経由smoke testへ更新した。
- [x] (2026-06-23 02:54 JST) format、lint、typecheck、build、Compose config、preflightを実行し、必要な修正を反映した。
- [x] (2026-06-23 02:54 JST) agent browserでdev環境の公開画面、管理者ログイン、BFF API、ブラウザNetwork logを検証した。
- [x] (2026-06-23 02:54 JST) Cloudflared tokenを入れたproduction相当環境を起動し、`https://bingo-stg.nutfes.net` のsmoke testとagent browser検証を実施した。

## Surprises & Discoveries

- Observation: `src/lib/supabase/proxy.ts` はNext.js 16のroot `proxy.ts` から呼ばれており、旧MiddlewareではなくProxy規約に合っていた。
  Evidence: `proxy.ts` がrootにあり、Next.js 16.2.6 docsの `proxy.ts` conventionと一致していた。

- Observation: 既存migrationはpublic schemaとStorageのanon/authenticated権限を既に絞っていた。
  Evidence: `supabase/migrations/20260525000000_lock_down_public_api_surface.sql` がpublic schemaのanon/authenticated権限をrevokeし、service_role policyを作っている。

- Observation: 既存のローカルSupabase volumeはPostgreSQL 17で初期化済みで、現在のSupabase CLI構成はPostgreSQL 15.8を要求した。
  Evidence: `mise run dev` が `database files are incompatible with server` と `initialized by PostgreSQL version 17` で失敗した。既存データを壊さないため、別 `project_id` の一時Supabase stackを起動してdev検証した。

- Observation: Cloudflare Dashboard側のremote tunnel configに、古い `bingo-stg-api.nutfes.net -> http://kong:8000` が残っていた。
  Evidence: Cloudflared logの `Updated to new configuration` に `bingo-stg-api.nutfes.net` が表示された。Composeでは `cloudflared` は `frontend` networkだけ、`kong` は `backend` networkだけに接続されているため、このhostnameの `/auth/v1/settings` と `/rest/v1/` はHTTP 502になり、Supabaseは実到達できなかった。

## Decision Log

- Decision: Supabase KongをCloudflaredの公開先から外し、Cloudflaredは `app:3000` だけへ接続する。
  Rationale: 要求の公開境界は「Next.jsのみ公開」である。Supabaseを別hostnameで公開すると、ブラウザから直接叩かない実装にしても公開面は残る。
  Date/Author: 2026-06-23 / Codex

- Decision: Supabase AuthのログインとサインアップはServer Actionで実行する。
  Rationale: ブラウザSupabase clientを使うとSupabase URLとpublishable keyをbrowser bundleへ埋め込む必要がある。Server Actionならcookie更新をNext.js側で行い、Supabase接続情報をサーバー専用envにできる。
  Date/Author: 2026-06-23 / Codex

- Decision: 景品画像配信はNext.js routeがservice roleでStorageからdownloadする。
  Rationale: Storageを公開しない構成では `/storage/v1/object/public/*` をブラウザ向けURLとして扱えない。BFF routeが画像だけを返せば、Storage endpointとkeyを隠せる。
  Date/Author: 2026-06-23 / Codex

- Decision: `SUPABASE_PUBLIC_URL` と `API_EXTERNAL_URL` は本番envで `http://kong:8000` に固定する。
  Rationale: self-hosted Supabase serviceはこれらの値を要求するが、この運用では外部Supabase URLを持たない。メールリンクやOAuth callbackを主経路にせず、Next.js server-sideから内部Kongへ接続するため、container内DNS名を一貫して使う。
  Date/Author: 2026-06-23 / Codex

## Outcomes & Retrospective

実装と検証は完了した。ブラウザからSupabase Auth、PostgREST、Storageへ直接requestする経路は削除され、認証はServer Action、公開データと景品画像はNext.js BFF routeを通るようになった。production Composeでは `cloudflared` は `frontend` networkだけに接続し、`kong` は `backend` networkだけに接続するため、Cloudflared containerからSupabase gatewayへ到達できない。

未解決の外部作業として、Cloudflare Dashboardに残っている `bingo-stg-api.nutfes.net -> http://kong:8000` のPublic Hostnameを削除する必要がある。現時点ではHTTP 502でSupabaseは公開されていないが、公開境界を運用表示上もNext.jsだけにするには、Dashboard側も `bingo-stg.nutfes.net -> http://app:3000` だけにする。

## Context and Orientation

このリポジトリはNext.js 16、React 19、self-hosted Supabase、Cloudflaredを使う。Next.jsは `Dockerfile` でbuildされ、productionでは `compose.prod.yml` の `app` serviceとして起動する。Supabase相当の最小構成は `db`、`auth`、`rest`、`storage`、`kong` serviceである。KongはSupabase Auth、PostgREST、Storageの内部API gatewayで、Next.js server-side処理だけが `http://kong:8000` へ接続する。

Next.jsの公開入口は、ページ、Server Action、Route Handlerである。Server Actionはサーバー上で実行される関数で、この作業では `src/features/admin/auth/actions.ts` の `login` と `signUp` が該当する。Route Handlerは `src/app/api/.../route.ts` で定義するHTTP APIで、公開画面データは `src/app/api/bingo/*`、景品画像は `src/app/api/prize-images/[...path]/route.ts` が担当する。

管理者書き込みは `src/components/admin/server-actions.ts` の `createAdminClient()` を経由する。この関数は `src/lib/auth/auth.ts` の `requireAdmin()` で現在のSupabase Auth userと `profiles.role = 'admin'` を確認してから、service role clientを返す。したがって管理者書き込みはサーバー側の管理者検証後に実行される。

運用入口は `mise.toml` と `infra/scripts/*.sh` である。`mise run dev` はSupabase CLI local stackを起動し、`supabase status -o env` からkeyを取り出してDocker Composeへ渡す。`mise run prod:preflight`、`mise run prod:deploy`、`mise run prod:smoke` は `infra/scripts/annual-ops.sh` を通る。

## Plan of Work

最初に、判断履歴をADRへ記録する。`docs/adr/ADR-0004-nextjs-only-public-boundary.md` を追加し、Cloudflaredの公開先をNext.jsだけにすること、Supabase URLとkeyをbrowser bundleへ出さないこと、AuthやStorageをBFF経由にすることを説明する。旧判断であるADR-0002には、ADR-0004でsupersedeされたことだけを追記する。

次に、Next.js内のSupabase clientを整理する。`src/lib/supabase/config.ts` に `getSupabasePublishableKey()` を追加し、`getSupabaseServerUrl()` は `SUPABASE_SERVER_URL` だけを見る。`src/lib/supabase/server.ts` と `src/lib/supabase/proxy.ts` は `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` の代わりに `SUPABASE_PUBLISHABLE_KEY` を使う。ブラウザ専用の `src/lib/supabase/client.ts` は削除する。

次に、認証フォームをServer Actionへ移す。`src/features/admin/auth/actions.ts` に `login` と `signUp` を追加する。`src/features/admin/auth/login-form.tsx` と `src/features/admin/auth/sign-up-form.tsx` は `useActionState` と `<Form action={...}>` を使い、ブラウザSupabase clientをimportしない。redirect先はserver action内で相対pathだけ許可する。

次に、Storage配信をBFF化する。`src/app/api/prize-images/[...path]/route.ts` は `createServiceRoleClient().storage.from(PRIZE_IMAGES_BUCKET).download(path)` を使い、画像content typeだけを返す。`next.config.ts` のSupabase remote image許可は削除する。

次に、Composeと運用scriptを更新する。`compose.cloudflare.yml` は `app` だけに依存する。`compose.prod.yml` の `kong` はbackend networkだけに置き、`app` には `SUPABASE_SERVER_URL`、`SUPABASE_PUBLISHABLE_KEY`、`SUPABASE_SECRET_KEY` を渡す。`Dockerfile` はSupabase public envをbuild argにしない。`infra/scripts/preflight.sh` は `SUPABASE_SERVER_URL`、`SUPABASE_PUBLIC_URL`、`API_EXTERNAL_URL` が `http://kong:8000` であることを検査する。`infra/scripts/smoke-test.sh` はNext.js URLだけを受け取り、Next.js health、ready、BFF APIを叩く。

最後に、README、env example、CIを更新する。`.env.production.example` はPublic Hostnameを `app -> http://app:3000` だけにし、Supabase内部URLを `http://kong:8000` にする。CIのCompose configとpreflightは新しいenv名で通す。

## Concrete Steps

作業ディレクトリは常に `/home/tkymhrt/ghq/github.com/NUTFes/nutfes-Bingo` とする。

編集後、静的検査を実行する。

    pnpm run fmt:check
    pnpm run lint
    pnpm exec tsc --noEmit
    pnpm run build
    sh -n infra/scripts/*.sh
    SUPABASE_PUBLISHABLE_KEY=ci-publishable-key SUPABASE_SECRET_KEY=ci-secret-key SUPABASE_SERVICE_ROLE_KEY=ci-service-role-key docker compose -f compose.dev.yml config --quiet
    CLOUDFLARE_TUNNEL_TOKEN=ci-cloudflare-token docker compose --env-file .env.production.example -f compose.prod.yml -f compose.cloudflare.yml config --quiet

preflightは本番秘密値を含む `.env.production` を使うため、localでは一時envを生成して実行する。

    tmpdir=$(mktemp -d)
    ./infra/scripts/init-production-env.sh "$tmpdir/.env.production"
    mkdir -p "$tmpdir/postgres" "$tmpdir/storage"
    sed -i \
      -e "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://app.example.test|" \
      -e "s|^SITE_URL=.*|SITE_URL=https://app.example.test|" \
      -e "s|^SUPABASE_SERVER_URL=.*|SUPABASE_SERVER_URL=http://kong:8000|" \
      -e "s|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=http://kong:8000|" \
      -e "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=http://kong:8000|" \
      -e "s|^ADDITIONAL_REDIRECT_URLS=.*|ADDITIONAL_REDIRECT_URLS=https://app.example.test/**|" \
      -e "s|^CLOUDFLARE_TUNNEL_TOKEN=.*|CLOUDFLARE_TUNNEL_TOKEN=ci-cloudflare-token|" \
      -e "s|^SUPABASE_DB_DATA_PATH=.*|SUPABASE_DB_DATA_PATH=$tmpdir/postgres|" \
      -e "s|^SUPABASE_STORAGE_DATA_PATH=.*|SUPABASE_STORAGE_DATA_PATH=$tmpdir/storage|" \
      "$tmpdir/.env.production"
    chmod 600 "$tmpdir/.env.production"
    NUTFES_ALLOW_NON_LXC=1 ENV_FILE="$tmpdir/.env.production" ./infra/scripts/preflight.sh

dev検証では次を実行する。

    mise run dev

別shellまたはagent browserから `http://localhost:3000` を開き、公開画面、管理者ログイン画面、`/api/health`、`/api/ready`、`/api/bingo/state`、`/api/bingo/prizes`、`/api/bingo/screen` を確認する。ブラウザのnetwork requestに `localhost:54321` やSupabase hostnameが出ないことも確認する。

production相当検証では、ユーザーが指定した一時Cloudflared tokenを `.env.production` の `CLOUDFLARE_TUNNEL_TOKEN` に入れ、Cloudflare Dashboardで `bingo-stg.nutfes.net -> http://app:3000` が設定済みであることを前提にする。永続volume pathは検証用directoryを用意する。

    mise run prod:config
    mise run prod:deploy
    mise run prod:smoke

agent browserで `https://bingo-stg.nutfes.net` を開き、devと同じ主要画面/APIを確認する。Supabase hostnameや `/auth/v1`、`/rest/v1`、`/storage/v1` への直接requestがブラウザから出ないことを確認する。

## Validation and Acceptance

受け入れ条件は、公開境界がNext.jsだけになり、ブラウザからSupabaseを直接呼ぶ経路が消えることである。

コード上は `rg -n "NEXT_PUBLIC_SUPABASE|createBrowserClient|lib/supabase/client" src Dockerfile compose*.yml mise.toml infra/scripts .env.example .env.production.example` がヒットしないこと。`compose.cloudflare.yml` は `cloudflared` が `app` にだけ依存し、`kong` を公開networkへ出さないこと。`docker compose --env-file .env.production.example -f compose.prod.yml -f compose.cloudflare.yml config --services` は `cloudflared`、`app`、`kong` を含むが、rendered configでhost port 80/443が公開されないこと。

動作上は、`mise run prod:smoke` が `Smoke test passed for https://...` を出すこと。`/api/ready` はNext.jsからSupabaseへ到達できるときHTTP 200を返すこと。公開画面のBFF APIである `/api/bingo/state`、`/api/bingo/prizes`、`/api/bingo/screen` がHTTP 200を返すこと。

ブラウザ検証では、devとproduction相当の両方でNetwork logにSupabase公開hostname、`/auth/v1`、`/rest/v1`、`/storage/v1` への直接requestがないこと。景品画像がある場合は `/api/prize-images/*` から配信されること。

## Idempotence and Recovery

`prod:preflight` は読み取り検査だけなので何度実行しても安全である。`prod:deploy` は既存の一回限り `migrate` containerを削除してからComposeを起動するため再実行できる。`.env.production` のSupabase内部URLは `http://kong:8000` に戻せばよい。誤ってCloudflare DashboardでSupabase hostnameを作った場合は削除し、`app -> http://app:3000` のhostnameだけを残す。

Server Actionへの移行後も、ログインできない場合はまず `SUPABASE_SERVER_URL`、`SUPABASE_PUBLISHABLE_KEY`、`SUPABASE_SECRET_KEY` がapp containerに入っているか、`/api/ready` が成功するかを確認する。ブラウザでSupabase URLへ直接アクセスさせる設定へ戻す必要はない。

## Artifacts and Notes

検証結果:

- `pnpm run fmt:check`、`pnpm run lint`、`pnpm exec tsc --noEmit`、`pnpm run build`、`sh -n infra/scripts/*.sh` は成功した。
- `docker compose -f compose.dev.yml config --quiet` と production compose config check は成功した。
- 一時production envで `NUTFES_ALLOW_NON_LXC=1 ENV_FILE=... ./infra/scripts/preflight.sh` は成功した。
- `rg` で `NEXT_PUBLIC_SUPABASE`、`NEXT_PUBLIC_ENABLE_ADMIN_SIGNUP`、`createBrowserClient`、`lib/supabase/client`、`/auth/v1`、`/rest/v1`、`/storage/v1` の実装・設定残りを確認し、コードと運用設定から除去済みであることを確認した。
- dev検証では `/api/health`、`/api/ready`、`/api/bingo/state`、`/api/bingo/prizes`、`/api/bingo/screen` がHTTP 200を返した。agent browserで `/`、`/prizes`、`/screen`、`/auth/login` を開き、ログインServer Actionをdummy credentialでsubmitした。Network logに `supabase`、`auth/v1`、`rest/v1`、`storage/v1` は出なかった。
- staging検証では `https://bingo-stg.nutfes.net` に対して `annual-ops.sh smoke` が成功した。agent browserで `/`、`/prizes`、`/screen`、`/auth/login` を開き、ログインServer Actionをdummy credentialでsubmitした。Network logに `supabase`、`auth/v1`、`rest/v1`、`storage/v1`、`bingo-stg-api` は出なかった。
- stagingのresponse headerで production CSP は `connect-src 'self'` になっていた。
- Dashboardに残る `bingo-stg-api.nutfes.net` は `/auth/v1/settings` と `/rest/v1/` がHTTP 502で、Supabaseへ実到達できないことを確認した。

## Interfaces and Dependencies

`src/lib/supabase/config.ts` は次の関数を提供する。

    getSupabaseServerUrl(): string
    getSupabasePublishableKey(): string
    getSupabaseSecretKey(): string
    hasSupabaseServerEnvVars(): boolean
    hasSupabaseServiceRoleEnvVars(): boolean

`src/features/admin/auth/actions.ts` は次のServer Actionを提供する。

    login(redirectTo: string | undefined, prevState: AuthActionState, formData: FormData): Promise<AuthActionState>
    signUp(prevState: AuthActionState, formData: FormData): Promise<AuthActionState>
    logout(): Promise<never>

`infra/scripts/annual-ops.sh smoke [APP_URL]` はSupabase URLを引数に取らない。`infra/scripts/smoke-test.sh APP_URL` はNext.jsの公開URLだけを検査する。

## Revision Notes

2026-06-23: 初版を作成した。公開境界をNext.jsだけに変更し、BFF化、Compose整理、運用検証を一つの実行可能な計画として追跡するため。
