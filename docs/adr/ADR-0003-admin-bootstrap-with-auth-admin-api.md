# ADR-0003: 初期AdminはAuth Admin APIとprivate DB functionで作成する

## Status

Accepted

## Context

本番環境ではSupabase Studioを通常起動しない。メールサーバーも運用しないため、確認メール、招待メール、パスワードリセットメールに依存した管理者アカウント運用は再現性が低い。

従来の手順は、本番セットアップ時だけサインアップを開放し、作成後に `profiles.role = 'admin'` を手動更新するものだった。この方法は、サインアップ開放の戻し忘れ、手動SQLの誤り、メール確認なしAuth userの扱いが運用担当者へ漏れる。

Supabase Authは、service roleまたはadmin JWTを使うAdmin APIでuserを作成・更新できる。Admin APIでは `email_confirm` と `password` を明示できる。一方、このアプリケーションの管理者判定は `public.profiles.role = 'admin'` をsource of truthとしている。

## Decision

本番の初期Admin作成は、LXC上の明示的な運用コマンドだけで行う。

`mise run prod:admin:bootstrap` は、Supabase Auth Admin APIでAuth userを作成または更新し、DB側の `private.bootstrap_initial_admin(uuid, text)` functionで `profiles.role = 'admin'` を設定する。

`private` schemaはPostgREST公開対象に含めず、anon、authenticated、service_roleへ実行権限を付与しない。運用スクリプトはDocker Compose経由でDBへ接続し、LXC内の管理操作としてだけfunctionを実行する。

メールによる招待やリセットは使用しない。パスワード復旧は `mise run prod:admin:reset-password` でAuth Admin APIから明示的に更新する。確認用に `prod:admin:list` と `prod:admin:verify` を用意する。

## Consequences

本番で一時的にサインアップを開放する必要がなくなる。初期Admin作成は、確認用環境変数、email、password file、稼働中のCompose stackが揃わなければ実行できない。

Auth userの作成はSupabase Authに任せるため、`auth.users` への直接insertを避けられる。Admin権限は既存設計どおり `profiles.role` に集約される。

運用担当者は初期Admin作成前に `prod:deploy` を完了して、migrationとAuth/Kong/Appを起動しておく必要がある。複数Adminを許可する場合は、このADRを編集せず、新しいADRで運用方針をamendする。

## Supersedes / Amends

なし
