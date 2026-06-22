# ADR-0004: 公開境界をNext.jsだけにする

## Status

Accepted

## Context

ADR-0002では、CloudflaredからNext.jsとSupabase Kongを別々のhostnameへ直接公開する判断を採用した。この構成ではSupabase Auth、PostgREST、StorageがCloudflare Tunnel越しに到達可能になり、ブラウザ用のSupabase URLやpublishable keyをNext.js buildへ渡す必要があった。

今回の運用要求では、外部公開する入口をNext.jsだけに絞る。ブラウザからSupabaseやS3互換Storageを直接呼ばせず、読み取り、認証、景品画像配信、公開アクション、管理者書き込みをすべてNext.jsの画面、Server Action、Route Handler経由にする。service role keyやanon相当のkeyはブラウザに出さない。

## Decision

本番公開境界はNext.jsだけにする。

Cloudflare TunnelのPublic Hostnameはアプリ用の1つだけを作り、serviceは `http://app:3000` にする。CloudflaredはComposeの `frontend` network上で `app` にだけ接続する。Supabaseの `db`、`auth`、`rest`、`storage`、`kong` はDocker内部networkに置き、Cloudflaredの公開先にもLXCホストの公開portにも出さない。

Next.js server-side処理は `SUPABASE_SERVER_URL=http://kong:8000` でSupabase Kongへ接続する。Supabase Authの通常ログインとサインアップはブラウザ用Supabase clientではなくServer Actionで実行する。景品画像配信はNext.jsの `/api/prize-images/*` がservice role clientでStorageから取得して返す。公開画面のデータ取得は既存の `/api/bingo/*` routeを使う。管理者書き込みは既存どおり `requireAdmin()` で管理者検証した後、server-sideのservice role clientで実行する。

環境変数は、ブラウザへ埋め込む `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を使わない。サーバー専用の `SUPABASE_PUBLISHABLE_KEY`、`SUPABASE_SECRET_KEY`、`SUPABASE_SERVER_URL` を使う。`SUPABASE_PUBLIC_URL` と `API_EXTERNAL_URL` はself-hosted Supabase container向けの設定値として `http://kong:8000` に固定する。

## Consequences

公開面はNext.jsだけになるため、Supabase API key、Storage endpoint、PostgREST schemaを直接インターネットへ出さずに済む。Cloudflare Dashboardで必要なPublic Hostnameも1つに減る。

Supabase Authのメールリンクや外部OAuth providerのように、ブラウザがSupabase Auth URLへ直接戻る機能はこの構成では主経路にしない。このリポジトリの本番運用はメールサーバーを使わず、初期Adminとパスワード再設定はADR-0003の運用コマンドで行う。

smoke testはSupabase hostnameを直接叩かず、Next.jsの `/api/ready` と `/api/bingo/*` を通してDB、PostgREST、Storageを間接確認する。将来Supabase APIを外部公開する必要が出た場合は、このADRを編集せず、新しいADRでこの判断をsupersedeする。

## Supersedes / Amends

Supersedes ADR-0002の「CloudflaredでNext.jsとSupabase Kongを別hostnameへ直接公開する」判断。ADR-0001のProxmox LXC + Cloudflared固定方針と、ADR-0003のAdmin bootstrap方針は維持する。
