# ADR-004: VPS直接公開とプロジェクト管理のself-hosted Supabaseを採用する

## Status

Accepted

## Date

2026-06-09

## Context

本番構成は `compose.prod.yml` で Next.js、内部Caddy、cloudflaredを起動し、self-hosted Supabaseは別途用意された外部Docker networkに存在することを前提としている。この構成ではCloudflare Tunnelを利用できない環境で公開できず、Supabaseのサービス構成、バージョン、永続データ、migration、backupをアプリのリポジトリから一貫して管理できない。

本アプリはSupabaseのPostgreSQL、Auth、PostgREST、Storageを利用する。一方、公開データ配信はショートポーリングへ移行済みであり、Realtime、Edge Functions、Analyticsは利用していない。StudioとSupavisorも通常のアプリ実行経路には不要である。

低スペックVPSで公開テストできること、Cloudflare Tunnelを任意に残せること、Supabase Cloudを使わないこと、秘密情報と永続データをGit管理外に置くことが必要である。

## Decision Drivers

- Cloudflare Tunnelなしで標準的なVPSへ公開できること
- Supabaseの構成とイメージバージョンをリポジトリで再現できること
- 利用していないサービスを起動せず、メモリ消費と攻撃面を減らすこと
- migration、backup、restoreを明示的かつ再実行可能な手順にすること
- ブラウザへ公開するSupabase APIを必要最小限にすること
- 既存のAuth、PostgREST、Storage利用を壊さないこと

## Options Considered

### Option 1: 既存のCloudflare Tunnel構成を維持し、Supabaseだけ別管理する

Pros:

- 現在の公開経路を変更しなくてよい。
- Supabase公式Docker構成を別ディレクトリでそのまま運用しやすい。

Cons:

- cloudflaredなしで公開できない。
- アプリとSupabaseの起動、ネットワーク、環境変数、backupが分散する。

### Option 2: アプリと最小Supabase stackを1つのComposeで管理し、公開方式をoverrideで選ぶ

Pros:

- Caddy、Next.js、Kong、Auth、PostgREST、Storage、PostgreSQLを一度に再現できる。
- VPS直接公開とCloudflare TunnelをCompose overrideで選択できる。
- 未使用サービスを削除し、内部networkと公開ポートを一箇所で確認できる。
- migrationとbackupを同じCompose projectに対して実行できる。

Cons:

- Supabase公式Composeの更新を追跡し、必要な差分を手動で反映する必要がある。
- 構成ファイルが大きくなり、運用責任がアプリ側へ移る。

### Option 3: Supabaseを使わずPostgreSQL、独自Auth、ローカルファイル配信へ置き換える

Pros:

- コンテナ数をさらに減らせる。
- Supabase固有の構成から離れられる。

Cons:

- Auth、REST、Storageとアプリコードを広範囲に書き換える必要がある。
- 今回の公開基盤整備としては変更範囲とリスクが大きすぎる。

## Decision

Option 2を採用する。

`compose.prod.yml`をアプリと最小self-hosted Supabaseを含む基底構成とする。`compose.vps.yml`はCaddyの80/443をホストへ公開し、公開DNS名を指定してCaddy Automatic HTTPSを利用する。`compose.cloudflare.yml`はcloudflaredを追加し、CaddyをDocker内部のHTTP入口として利用する。

SupabaseはPostgreSQL、Auth、PostgREST、Storage、Kongを残す。Realtime、Edge Functions、Analytics、Vector、Studio、postgres-meta、Supavisor、imgproxyは起動しない。Storageは既存の景品画像アップロード機能が依存するため残すが、利用していない画像変換は無効化する。

ブラウザからは同一オリジンの `/supabase/auth/v1/*` だけをKongへ転送する。Next.jsサーバーはDocker内部の `http://kong:8000` を使い、PostgRESTとStorageを外部公開しない。

## Rationale

本アプリの一般利用者はSupabase RESTやStorageへ直接接続しない。ブラウザが直接利用するのは管理者ログインのAuth APIだけであり、その他はNext.jsのServer ActionsとRoute Handlersを経由する。そのためKong全体を公開せず、CaddyでAuthパスだけを許可する方が攻撃面を小さくできる。

Supabase公式構成は全サービスで4 GB以上を最低要件としているが、公式ドキュメントは不要なRealtime、Storage、imgproxy、Edge Runtimeを削除可能としている。今回はStorageが必要なので残し、それ以外の未使用サービスを除外することで低スペックVPSでの公開テストを現実的にする。

## Consequences

### Positive

- cloudflaredなしでCaddyが公開証明書を自動取得し、80/443で公開できる。
- Supabase Cloudと外部Supabase stackに依存せず、リポジトリだけで構成を再現できる。
- 未使用コンテナと公開APIを減らせる。
- DBとStorageのbackup/restore対象が明確になる。

### Negative

- OS、Docker、PostgreSQL、Supabase各サービスの更新、監視、backupは運用者の責任になる。
- 公式Supabase Docker構成の更新時に、固定したupstream commitとの差分確認が必要になる。
- VPS直接公開ではCloudflareのDDoS緩和を受けられない。

### Neutral / Trade-offs

- Storageを残すため、Storage APIとファイルvolumeの運用は継続する。
- Studioを常時起動しないため、管理作業はmigration、SQL、CLIを基本とする。
- Supavisorを起動しないため、DBをホストや外部へ公開しない。保守接続は `docker compose exec db psql` を使う。

## Implementation Notes

- Supabase設定の基準はupstream commit `99f0518137da8ca05cc78cb083e3488a38a573e8` とする。
- SupabaseとCaddyのイメージタグは固定し、更新前にDBとStorageをbackupする。
- DBとStorageのbind mount先は環境変数で指定し、本番ではリポジトリ外の `/srv/nutfes-bingo/` 配下を使う。
- `.env.production` はGitへ追加せず、所有者root、mode 0600を推奨する。
- productionではGoTrueの公開signupを無効化する。管理者作成時だけ計画的に有効化し、作成後に戻す。
- DB、Kong、Auth、PostgREST、Storageのポートをホストへ公開しない。
- rollbackはbackupをrestoreしたうえで、直前のComposeとイメージタグへ戻す。

## Validation

- [x] `pnpm fmt:check`
- [x] `pnpm lint`
- [x] `pnpm build`
- [x] production Composeのconfig検証
- [x] VPS direct Composeのconfig検証
- [x] Cloudflare override Composeのconfig検証
- [x] 最小Supabase stackの起動とmigration適用
- [x] `/api/health`、`/api/ready`、管理者Auth、Storage画像の疎通確認
- [x] backupから一時環境へrestoreできること

## Related

- Related ADR: `docs/adr/ADR-001-replace-public-realtime-websocket-with-short-polling.md`
- Supersedes: `docs/adr/ADR-002-production-docker-cloudflare-tunnel.md`
- 実装計画: `docs/exec-plans/2026-06-09-vps-self-hosted-supabase.md`
