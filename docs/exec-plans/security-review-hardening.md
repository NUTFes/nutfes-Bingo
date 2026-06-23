# セキュリティレビューと公開イベント堅牢化 ExecPlan

## 目的

NUTFes Bingo の現行機能を維持しつつ、Supabase/Next.js の現行推奨に照らして、
公開ユーザー操作、認証付き管理操作、CI の運用リスクを低減する。

## 現状把握

- Next.js App Router / React / Supabase SSR / Supabase Auth / Supabase Realtime / Storage を利用する。
- 公開画面は番号、景品、リーチ数、リアクションを Realtime で購読する。
- 管理画面は Supabase Auth のユーザーと `profiles.role = 'admin'` で保護し、
  Server Action から service role クライアントで DB/Storage を更新する。
- CI は format/lint/typecheck/build と React Doctor を実行する。

## 実施方針

1. 公開ユーザーからの書き込みは直接 `anon` 権限で受けず、Server Action 経由に集約する。
2. リーチ数更新は DB 側で直列化し、同時実行時に集計値が壊れないようにする。
3. 公開イベントには軽量なサーバー側レート制限を入れ、Realtime/DB へのスパムを抑制する。
4. Supabase SSR の cookie 更新時に返すべき cache-control ヘッダーを維持する。
5. CI はチェックで失敗させ、PR ブランチへの自動コミットや不要な write 権限を避ける。

## 変更対象

- `supabase/migrations/*_harden_public_events.sql`
- `src/features/user/actions/bingo-public.ts`
- `src/lib/supabase/proxy.ts`
- `src/types/database.types.ts`
- `.github/workflows/*.yml`
- `package.json` / `pnpm-lock.yaml`

## 検証

- `pnpm install --frozen-lockfile`
- `pnpm run fmt:check`
- `pnpm run lint`
- `pnpm exec tsc --noEmit`
- `pnpm run build`
- 可能であれば Supabase ローカル DB への migration 適用と RPC 動作確認

## 未確認事項

- 本番 Supabase プロジェクト側の Auth 設定、Data API exposed schema 設定、JWT 有効期限。
- 本番の CDN/リバースプロキシ設定。
- 公開イベントの許容レートが実運用の来場者数・ネットワーク構成に合っているか。
