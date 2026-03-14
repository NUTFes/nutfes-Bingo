# NUTFes Bingo

技大祭向けビンゴアプリ（公開画面・スクリーン表示・運営管理）です。  
Phase 5 時点で **Next.js App Router + Server Actions 中心** の構成に移行済みです。

## アーキテクチャ概要

- **Next.js App Router**（`src/app`）
  - 公開: `/`, `/prizes`, `/screen`
  - 管理: `/admin`, `/admin/prizes`
  - 認証: `/auth/*`
- **Server Components で初期データ取得**
  - `src/lib/bingo/queries.ts`（`"use cache"` + `cacheTag`）
- **Client Components は表示とリアルタイム同期に専念**
  - `src/lib/bingo/client.ts` の hooks で Realtime 購読

## Server Actions-first 設計

更新系は基本的に Server Actions に集約:

- 管理操作: `src/app/admin/actions.ts`
  - 番号・景品CRUD、リーチ増減、アンケート状態更新
- 公開画面操作: `src/app/actions/bingo-public.ts`
  - リーチ記録、リアクションスタンプ送信
- 認証操作: `src/app/auth/actions.ts`
  - ログイン/サインアップ/パスワード再設定/ログアウト

Server Actions 実行後は `updateTag` / `revalidateTag` で一覧キャッシュを更新します。

## Supabase 連携の境界

- **Server Actions / 認証判定（サーバー）**
  - `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`
- **初期データのサーバー読み取り**
  - `src/lib/bingo/queries.ts`（Supabase JS で read 専用利用）
- **クライアント側の Realtime 購読**
  - `src/lib/supabase/client.ts`
  - `src/lib/bingo/client.ts`（`numbers`, `prizes`, `app_state`, `reach_logs`, `stamp_triggers`）

## 認証フロー（要約）

1. `/admin` 配下は `proxy.ts` + `src/lib/supabase/proxy.ts` で未ログインを `/auth/login` へリダイレクト
2. `src/app/auth/actions.ts` がログイン/登録/再設定を処理
3. メールリンク確認は `src/app/auth/confirm/route.ts`
4. 管理ページは `src/app/admin/layout.tsx` の `requireAdmin()` で権限チェック

> メール認証をスキップする運用のため、Supabase Auth 設定の **Confirm email は無効化** してください（autoconfirm 前提）。

## 主要ディレクトリ/ファイル

- `src/app/` : ルーティング、ページ、Server Actions
- `src/components/` : 画面コンポーネント（admin/public/ui）
- `src/lib/bingo/` : ドメインロジック（queries, realtime hooks, types）
- `src/lib/supabase/` : Supabase クライアント生成（server/client/proxy）
- `src/lib/auth.ts` : 現在ユーザー取得・管理者ガード
- `supabase/` : SQL / マイグレーション関連
- `proxy.ts` : セッション更新・保護ルートのエントリ

## セットアップ

```bash
pnpm install
cp .env.example .env.local
```

`.env.local` に設定（必須）:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

推奨（メールリンクのリダイレクトURLを安定化）:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 実行コマンド

```bash
pnpm dev      # 開発サーバー
pnpm lint     # 静的解析
pnpm build    # 本番ビルド
pnpm start    # ビルド済みアプリ起動
```
