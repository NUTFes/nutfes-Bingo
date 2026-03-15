# NUTFes Bingo

技大祭向けビンゴアプリです。  
公開向け（User）と運営向け（Admin）を分離した Next.js App Router 構成で運用しています。

## 現在のアーキテクチャ

- **Route Groups（App Router）**
  - 公開: `/`, `/prizes`, `/screen`（`src/app/(user)`）
  - 管理: `/admin`, `/admin/prizes`, `/admin/prizes/new`（`src/app/(admin)/admin`）
  - 認証: `/auth/*`（`src/app/(admin)/auth`）
- **UI スタック**
  - User: CSS Modules（`src/features/user/_shared` + `src/styles/user`）
  - Admin: Tailwind CSS + React Aria Components（`src/components/ui` + `src/features/admin`）
- **共通基盤**
  - `src/shared/data`: Supabase client / queries / realtime
  - `src/shared/domain`: ドメイン型・定数・純ロジック
  - `src/shared/auth`: 認証・権限チェック
  - `src/shared/utils`: i18n / utility

## 主要ディレクトリ

- `src/app/(user)/` : 公開ページとレイアウト
- `src/app/(admin)/admin/` : 管理ページとレイアウト
- `src/app/(admin)/auth/` : 認証ページ・confirm route
- `src/features/user/` : 公開機能（home/prizes/screen/actions）
- `src/features/admin/` : 管理機能（dashboard/prizes/auth）
- `src/components/ui/` : RAC ベースの UI プリミティブ（Admin 側中心）
- `src/shared/` : データアクセス、ドメイン、認証、共通ユーティリティ
- `src/styles/user/`, `src/styles/admin/` : グローバルスタイル
- `supabase/` : マイグレーション・DB 関連ファイル
- `proxy.ts` : セッション更新・保護ルートの入口

## Server Actions

- `src/features/admin/dashboard/actions.ts`  
  番号操作、リーチ増減、アンケート状態更新
- `src/features/admin/prizes/actions.ts`  
  景品 CRUD と画像アップロード/削除
- `src/features/admin/auth/actions.ts`  
  ログイン、サインアップ、パスワード更新
- `src/features/user/actions/bingo-public.ts`  
  公開側リアクション送信、リーチ記録

## Supabase 連携の境界

- **Server 側クライアント**
  - `src/shared/data/supabase/server.ts`
  - `src/shared/data/supabase/proxy.ts`
- **Client 側クライアント**
  - `src/shared/data/supabase/client.ts`
- **初期データ取得**
  - `src/shared/data/queries.ts`（`"use cache"` + `cacheTag`）
- **Realtime 購読**
  - `src/shared/data/realtime.ts`
- **DB 型**
  - `src/shared/data/database.types.ts`

## 認証フロー（要約）

1. `proxy.ts` + `src/shared/data/supabase/proxy.ts` が `/admin` 系を保護
2. 未ログインは `/auth/login` にリダイレクト
3. `src/features/admin/auth/actions.ts` が認証操作を処理
4. `src/app/(admin)/auth/confirm/route.ts` がメールリンク確認
5. `src/app/(admin)/admin/layout.tsx` で `requireAdmin()` を実施

> 運用方針として、Supabase Auth の **Confirm email は無効化**（autoconfirm 前提）してください。

## セットアップ

```bash
pnpm install
cp .env.example .env.local
```

`.env.local`（必須）:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

推奨:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## mise での環境構築・タスク実行（推奨）

このリポジトリには `mise.toml` を用意しており、`node` / `pnpm` のバージョン管理と
Supabase ローカル運用タスクをまとめて実行できます。

```bash
mise install
mise run install
mise run dev
```

Supabase タスク:

```bash
mise run supabase:start
mise run supabase:status
mise run supabase:db-reset
mise run supabase:typegen
mise run supabase:stop
```

## pnpm コマンド

```bash
pnpm dev
pnpm lint
pnpm build
pnpm start
```
