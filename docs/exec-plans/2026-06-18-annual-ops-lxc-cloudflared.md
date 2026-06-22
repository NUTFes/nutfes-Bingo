# 年次運用moduleをProxmox LXC + Cloudflaredへ固定する

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

この文書は `/home/tkymhrt/.agents/skills/execplan/references/PLANS.md` の形式に従って管理する。このリポジトリには `AGENTS.md` があり、大きな実装や実験では `docs/exec-plans/` に日本語のExecPlanを作成または更新するよう定めている。

## Purpose / Big Picture

この変更の目的は、技大祭当日に年1回だけ使う本番環境を、引き継ぎ担当者が少ない判断で再現できるようにすることにある。作業後は、Proxmox上のLXCからCloudflare Tunnelで公開する構成だけが本番の標準になり、担当者は `mise run prod:preflight`、`mise run prod:deploy`、`mise run prod:smoke` という小さなinterfaceを順に実行すればよい。

ここでいうmoduleは、呼び出し側が使うinterfaceと、その裏にあるimplementationをまとめた単位を指す。年次運用moduleとは、`.env.production` の検査、Compose設定の検査、migration、起動、疎通確認をまとめ、担当者に細かな順序知識を漏らさない運用上のmoduleである。深いmoduleとは、小さなinterfaceの裏に多くのimplementationを隠し、呼び出し側の判断を減らすmoduleを指す。

## Progress

- [x] (2026-06-17 17:10 UTC+8) 現状調査を行い、VPS直公開とCloudflare Tunnelの二系統が `DEPLOY_MODE` で切り替わることを確認した。
- [x] (2026-06-17 17:20 UTC+8) 本番公開経路をProxmox LXC + Cloudflaredへ固定するADRを追加した。
- [x] (2026-06-17 17:55 UTC+8) Compose、mise task、infra scriptsからVPS直公開の分岐を取り除いた。
- [x] (2026-06-17 18:00 UTC+8) 年次運用moduleとしてpreflight、deploy、smokeのinterfaceを追加した。
- [x] (2026-06-17 18:05 UTC+8) READMEとCIをProxmox LXC + Cloudflared固定の手順に揃えた。
- [x] (2026-06-17 18:15 UTC+8) format、lint、typecheck、build、Compose config、preflightを実行して成功を確認した。
- [x] (2026-06-18) Caddyを本番Composeとローカル開発Composeから削除し、CloudflaredからNext.jsとSupabase Kongへ直接到達する構成へ変更した。
- [x] (2026-06-18) Caddy削除後のformat、lint、typecheck、build、Compose config、preflightを再実行して成功を確認した。
- [x] (2026-06-18) 初期Admin作成方針をADR-0003に記録し、Auth Admin APIとprivate DB functionを使う運用へ決めた。
- [x] (2026-06-18) `private.bootstrap_initial_admin(uuid,text)` migrationと `infra/scripts/admin.sh` を追加した。
- [x] (2026-06-18) Admin bootstrap追加後のmigration dry-run、script構文、format、lint、typecheck、buildを実行して成功を確認した。
- [ ] Proxmox LXC本番ホスト上で `mise run prod:preflight`、`mise run prod:deploy`、`mise run prod:smoke` を実行して実公開経路を確認する。

## Surprises & Discoveries

- Observation: `pnpm run knip` は現在失敗する。
  Evidence: `supabase` devDependencyと、Supabase生成型 `src/types/database.types.ts` の未使用exportが検出された。これは今回のdeploy固定化とは別の品質interface整理で扱う。

- Observation: `.env.production.example` 単体でCloudflare用Compose configを検査すると失敗する。
  Evidence: `CLOUDFLARE_TUNNEL_TOKEN` が空で、`compose.cloudflare.yml` が必須値として扱うためである。CIではダミー値を注入して通している。

- Observation: `.env.production` の `JWT_KEYS` と `JWT_JWKS` はJSONを値に持つため、shellの `.` で読み込むと壊れる可能性がある。
  Evidence: preflightとsmokeのenv読み込みは、`KEY=value` 行を `export "$line"` として扱う実装にした。これによりJSONの波括弧や引用符をshell構文として解釈しない。

- Observation: Admin bootstrap migrationは現在の検証用production stackに対してdry-runで認識された。
  Evidence: `mise run prod:migrate:dry-run` が `Would push these migrations: 20260618000000_admin_bootstrap_private_functions.sql` を表示した。

## Decision Log

- Decision: 本番公開経路はProxmox LXC + Cloudflaredだけをサポートする。
  Rationale: 年1運用では柔軟性よりも手順の再現性が重要である。VPS直公開とCloudflare Tunnelの二系統を維持すると、firewall、DNS、Caddy待受、smoke testの判断が担当者へ漏れる。
  Date/Author: 2026-06-17 / Codex

- Decision: `DEPLOY_MODE` は削除し、Composeは常に `compose.prod.yml` と `compose.cloudflare.yml` を重ねる。
  Rationale: adapterが一つだけならseamは不要である。分岐を残すとinterfaceが浅くなり、implementationの知識がREADMEとscriptへ散る。
  Date/Author: 2026-06-17 / Codex

- Decision: preflightをdeploy前の必須interfaceにする。
  Rationale: `.env.production`、Cloudflared token、永続ディレクトリ、Compose configの誤りは、当日よりも前に落とすべきである。
  Date/Author: 2026-06-17 / Codex

- Decision: Caddyを廃止し、CloudflaredのPublic Hostnameを `app` と `supabase` に分ける。
  Rationale: Cloudflare Tunnelは複数hostnameを複数origin serviceへ直接転送できる。Supabase self-hosted stackはKongをAPI Gatewayとして標準pathを公開する前提なので、`/supabase` path proxyより別hostnameの方がframework/libraryの考え方に近い。
  Date/Author: 2026-06-18 / Codex

- Decision: 本番の初期Adminはサインアップ開放ではなく、Auth Admin APIとprivate DB functionで作成する。
  Rationale: 年1運用で本番サインアップを一時開放すると、戻し忘れや手動SQLの誤りが起こりやすい。Supabase Auth userはAdmin APIで作り、アプリ固有のAdmin判定は既存の `profiles.role = 'admin'` に集約する方が、責務が分かれて再現性も高い。
  Date/Author: 2026-06-18 / Codex

## Outcomes & Retrospective

コードベース上の固定化は完了した。`DEPLOY_MODE` と `compose.vps.yml` は削除され、Composeは常に `compose.prod.yml` と `compose.cloudflare.yml` を使う。さらにADR-0002でCaddyを廃止し、Cloudflaredから `app:3000` と `kong:8000` へ直接転送する構成へ変更した。`prod:preflight`、`prod:deploy`、`prod:smoke` が年次運用moduleの主要interfaceになった。

この作業環境では実際のProxmox LXCとCloudflare Tunnelを持たないため、本番ホスト上での `prod:deploy` と公開URLへの `prod:smoke` は未実行である。次の担当者はLXC上でこの2つを実行し、Cloudflare Public Hostnameから到達できることを確認する。

## Context and Orientation

このリポジトリはNext.js、self-hosted Supabase、CloudflaredをDocker Composeで動かす。Next.jsのアプリ本体は `Dockerfile` でbuildされ、`compose.prod.yml` の `app` として起動する。Supabase相当の最小構成は `db`、`auth`、`rest`、`storage`、`kong` である。CloudflaredはCloudflare Tunnelへ接続し、Cloudflare側のPublic Hostnameから `app:3000` と `kong:8000` へ転送する。

Admin accountとは、Supabase Authのuserと、`public.profiles` tableの `role = 'admin'` が揃ったログイン主体のことである。Supabase Auth Admin APIとは、service role secretを持つbackendだけが呼ぶ `/auth/v1/admin/users` APIで、Auth userを作成・更新できる。private DB functionとは、PostgRESTの公開schemaに含めない `private` schemaのPostgreSQL functionである。この計画では `private.bootstrap_initial_admin(uuid,text)` をLXC上の `psql` からだけ実行する。

現在の運用入口は `mise.toml` にあり、`prod:env:init`、`prod:preflight`、`prod:config`、`prod:deploy`、`prod:smoke`、`prod:up`、`prod:ps`、`prod:logs`、`prod:seed`、`prod:migrate:dry-run`、`prod:backup` が定義されている。`prod:up` は後方互換のaliasで、実体は `prod:deploy` である。`prod:preflight`、`prod:deploy`、`prod:smoke` は `infra/scripts/annual-ops.sh` を呼ぶ。

変更前の `compose.sh` は `DEPLOY_MODE` を読み、`compose.vps.yml` または `compose.cloudflare.yml` を選んでいた。変更後の `compose.sh` は常に `compose.prod.yml` と `compose.cloudflare.yml` を使う。`compose.vps.yml` は削除済みである。`compose.cloudflare.yml` はCloudflaredを起動する。Cloudflare Zero Trust側のPublic Hostnameは、アプリ用hostnameを `http://app:3000`、Supabase用hostnameを `http://kong:8000` へ向ける設定である。

`.env.production` は本番秘密値を含むファイルで、Gitにcommitしない。`infra/scripts/init-production-env.sh` は `.env.production.example` を基に秘密値を生成し、mode 0600で `.env.production` を作る。

## Plan of Work

最初に、ADRとExecPlanを追加して判断の履歴を残す。ADRは `docs/adr/ADR-0001-proxmox-lxc-cloudflared-production.md` とし、VPS直公開を廃止する理由と影響を記述する。ExecPlanはこのファイルであり、今後の作業進捗に応じて更新する。

次に、Composeの本番入口をCloudflared固定にする。`infra/scripts/compose.sh` から `DEPLOY_MODE` の分岐を削除し、常に `compose.prod.yml` と `compose.cloudflare.yml` を使うようにする。`compose.vps.yml` は削除する。本番とローカル開発のCaddy service、Caddyfile、Caddy volumeを削除し、Cloudflaredは `app` と `kong` のhealthcheck完了後に起動する。

次に、年次運用moduleを作る。`infra/scripts/preflight.sh` は、LXCで実行されていること、必要なコマンドがあること、`.env.production` の権限が狭いこと、必須値が空やplaceholderでないこと、永続ディレクトリが存在すること、Cloudflared serviceがCompose configに含まれることを検査する。`infra/scripts/annual-ops.sh` は `preflight`、`deploy`、`smoke`、`backup`、`migrate:dry-run` を一つのinterfaceにまとめる。

次に、`mise.toml` を更新する。`prod:preflight`、`prod:deploy`、`prod:smoke` を追加し、`prod:up` は後方互換のaliasとして `prod:deploy` と同じ動きにする。`prod:migrate:dry-run` は `annual-ops.sh migrate:dry-run` を呼ぶ。

Admin運用を深くするため、`supabase/migrations/20260618000000_admin_bootstrap_private_functions.sql` を追加する。このmigrationは `private` schemaを作り、`private.bootstrap_initial_admin(uuid,text)` を定義する。functionはAuth userが存在すること、同じemailであること、他のAdminが存在しないことを確認してから `profiles.role = 'admin'` を設定する。

次に、`infra/scripts/admin.sh` を追加する。このscriptは `bootstrap`、`reset-password`、`list`、`verify` を提供する。Auth userの作成・更新は、Composeの `app` imageを一時containerとして起動し、その中から `SUPABASE_SERVER_URL=http://kong:8000` に対してAuth Admin APIを呼ぶ。DB functionやAdmin一覧は `docker compose exec -T db psql` で実行する。

最後にREADMEとCIを更新する。READMEからVPS直公開の説明と `DEPLOY_MODE` を削除し、Proxmox LXC + Cloudflared固定の初回構築、preflight、deploy、smoke、backup、restore、Admin bootstrapを説明する。CIではVPS compose configの検査を削除し、Cloudflared固定のCompose configとshell script構文を検査する。

## Concrete Steps

作業ディレクトリは常に `/home/tkymhrt/ghq/github.com/NUTFes/nutfes-Bingo` とする。

まず文書を作成する。

    mkdir -p docs/adr docs/exec-plans
    $EDITOR docs/adr/ADR-0001-proxmox-lxc-cloudflared-production.md
    $EDITOR docs/exec-plans/2026-06-18-annual-ops-lxc-cloudflared.md

次にComposeとscriptを更新する。

    $EDITOR infra/scripts/compose.sh
    $EDITOR infra/scripts/preflight.sh
    $EDITOR infra/scripts/annual-ops.sh
    $EDITOR infra/scripts/admin.sh
    $EDITOR infra/scripts/deploy.sh
    $EDITOR infra/scripts/backup.sh
    $EDITOR infra/scripts/restore.sh
    $EDITOR compose.prod.yml
    $EDITOR compose.cloudflare.yml
    $EDITOR compose.dev.yml
    rm compose.vps.yml
    rm Caddyfile Caddyfile.prod

次に運用入口と手順を更新する。

    $EDITOR mise.toml
    $EDITOR README.md
    $EDITOR .env.production.example
    $EDITOR .github/workflows/ci.yml
    $EDITOR supabase/migrations/20260618000000_admin_bootstrap_private_functions.sql

検証は次の順で行う。

    pnpm run fmt:check
    pnpm run lint
    pnpm exec tsc --noEmit
    pnpm run build
    docker compose --env-file .env.production.example -f compose.prod.yml -f compose.cloudflare.yml config --quiet
    sh -n infra/scripts/*.sh
    ENV_FILE=.env.production mise run prod:migrate:dry-run

preflightは本番秘密値を含む `.env.production` を使うため、CIやlocalでは一時envを生成して検査する。`NUTFES_ALLOW_NON_LXC=1` は、LXC外でscript自体を検査するための逃げ道で、本番手順では使わない。

## Validation and Acceptance

受け入れ条件は、手順の分岐が消え、Cloudflared固定の本番運用が一つのinterfaceから検査できることである。

`mise run prod:config` はCloudflaredを含むCompose configを検査し、成功時は何も出力せず終了code 0になる。`mise run prod:preflight` はLXC本番ホストで実行したとき、`.env.production`、永続ディレクトリ、Docker、Cloudflared構成が正しければ `Preflight passed.` と表示する。`mise run prod:deploy` はpreflight後にCompose stackを起動し、最後にsmoke testが `Smoke test passed for https://app.example.com and https://supabase.example.com` の形で表示する。

Admin bootstrapの受け入れ条件は、`ADMIN_EMAIL`、password file、`CONFIRM_BOOTSTRAP_ADMIN=bootstrap-nutfes-bingo-admin` を指定して `mise run prod:admin:bootstrap` を実行すると、Auth userが作成または更新され、`prod:admin:list` にそのemailが `role = admin` として表示されることである。既に別Adminが存在する場合、bootstrapは失敗する。`mise run prod:admin:verify` は少なくとも1件のAdminがあれば `Admin account check passed: N admin(s)` と表示する。

READMEには `DEPLOY_MODE=vps` やVPS直公開の手順が残っていないこと。`compose.vps.yml` は存在しないこと。CIはCloudflared固定のCompose configだけを検査すること。

## Idempotence and Recovery

`prod:preflight` は読み取り検査だけなので何度実行しても安全である。`prod:deploy` は `migrate` の古い一回限りcontainerを削除してから `docker compose up -d --build --wait --remove-orphans` を実行するため、再実行できる。migrationはSupabase CLIのmigration履歴に従う。

`prod:admin:bootstrap` は、同じemailの初期Adminに対しては再実行できる。既に別Adminが存在する場合は停止するため、誤って二人目のAdminを作らない。password fileはscriptが削除しないので、運用担当者が確認後に削除する。`prod:admin:reset-password` は既存Adminにだけ作用する。

backupは `infra/scripts/backup.sh` がtimestamp directoryを作り、同じdirectoryが存在する場合は失敗する。restoreは破壊的操作なので `CONFIRM_RESTORE=restore-nutfes-bingo` がなければ実行しない。restore前には必ず別環境で検証し、対象backupの `SHA256SUMS` が通ることを確認する。

## Artifacts and Notes

現時点の調査で通ったコマンドは以下である。

    pnpm run fmt:check
    pnpm run lint
    pnpm exec tsc --noEmit
    pnpm run build

変更後に通ったコマンドは以下である。

    sh -n infra/scripts/compose.sh infra/scripts/preflight.sh infra/scripts/annual-ops.sh infra/scripts/deploy.sh infra/scripts/backup.sh infra/scripts/restore.sh infra/scripts/init-production-env.sh
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-anon-key SUPABASE_SECRET_KEY=ci-secret-key SUPABASE_SERVICE_ROLE_KEY=ci-service-role-key docker compose -f compose.dev.yml config --quiet
    CLOUDFLARE_TUNNEL_TOKEN=ci-cloudflare-token docker compose --env-file .env.production.example -f compose.prod.yml -f compose.cloudflare.yml config --quiet
    NUTFES_ALLOW_NON_LXC=1 ENV_FILE=<temporary generated env> ./infra/scripts/preflight.sh
    git diff --check
    pnpm run fmt:check
    pnpm run lint
    pnpm exec tsc --noEmit
    pnpm run build

Admin bootstrap追加後に通すコマンドは以下である。

    sh -n infra/scripts/*.sh
    ENV_FILE=.env.production mise run prod:migrate:dry-run
    pnpm run fmt:check
    pnpm run lint
    pnpm exec tsc --noEmit
    pnpm run build

Admin bootstrapの確認ガードは、確認用環境変数がない場合に以下のように失敗する。

    Admin operation failed: set CONFIRM_BOOTSTRAP_ADMIN=bootstrap-nutfes-bingo-admin to confirm

Admin password fileの権限が緩い場合は以下のように失敗する。

    Admin operation failed: ADMIN_PASSWORD_FILE must be mode 0600 or 0400, got 644

preflightの期待出力は以下である。

    Preflight passed.

## Interfaces and Dependencies

最終的な運用interfaceは以下である。

`infra/scripts/compose.sh` は、任意の `docker compose` 引数を受け取り、常に `.env.production`、`compose.prod.yml`、`compose.cloudflare.yml` を使って実行する。`DEPLOY_MODE` は受け取らない。

`infra/scripts/preflight.sh` は引数なしで本番前検査を実行する。環境変数 `ENV_FILE` で `.env.production` 以外のenv fileを指定できる。環境変数 `NUTFES_ALLOW_NON_LXC=1` はlocal/CIでLXC検査だけを無効化する。

`infra/scripts/annual-ops.sh` は第一引数に `preflight`、`deploy`、`smoke`、`backup`、`migrate:dry-run` のいずれかを取る。`deploy` はpreflight、deploy、smokeを順に行う。`smoke` は引数がなければ `.env.production` の `NEXT_PUBLIC_SITE_URL` と `NEXT_PUBLIC_SUPABASE_URL` を使う。

`infra/scripts/admin.sh` は第一引数に `bootstrap`、`reset-password`、`list`、`verify` のいずれかを取る。`bootstrap` は `ADMIN_EMAIL`、password fileまたは対話入力、`CONFIRM_BOOTSTRAP_ADMIN` を要求する。`reset-password` は `ADMIN_EMAIL`、password fileまたは対話入力、`CONFIRM_RESET_ADMIN_PASSWORD` を要求する。`list` と `verify` はDBの `profiles` と `auth.users` を読むだけである。

`mise.toml` はこのscriptを薄く呼ぶだけにする。operatorは原則として `mise run prod:preflight`、`mise run prod:deploy`、`mise run prod:smoke` を使う。

## Revision Notes

2026-06-17: 初版を作成した。Proxmox LXC + Cloudflared固定化と、年次運用moduleを深くするための作業を開始するため。

2026-06-17: Compose/mise/scripts/README/CIを更新した。VPS直公開のadapterを削除し、Cloudflared adapterだけにした。preflightとannual-opsを追加し、CIで一時envを生成してpreflightを検査するようにした。

2026-06-18: Caddyを本番とローカル開発から削除する方針に更新した。CloudflaredのPublic Hostnameは `app -> http://app:3000` と `supabase -> http://kong:8000` の2本にする。

2026-06-18: Admin bootstrapの方針を追加した。Supabase Studioやメール認証に依存せず、Auth Admin APIとprivate DB functionで初期Adminを作成する。

2026-06-18: Admin bootstrap実装後の検証結果を追記した。migration dry-run、shell構文、format、lint、typecheck、build、確認ガードの失敗動作を確認した。
