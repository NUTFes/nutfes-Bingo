# view-user/view-admin 統合プロジェクト

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

## Purpose / Big Picture

**達成したいこと**:
現在 `view-user` と `view-admin` として分離している 2 つの Next.js アプリケーションを、Next.js 16 App Router を使用した単一アプリケーションに統合する。

**ユーザーが得られる価値**:

1. **開発効率の向上**: 1 つのアプリを理解すればよく、重複コードが解消される
2. **メンテナンス性向上**: 依存関係が一元化され、後継者が引き継ぎやすくなる
3. **ビルド時間短縮**: Turbopack + 単一ビルドで高速化
4. **Docker 構成の簡素化**: 2 コンテナ → 1 コンテナ

**完了後に確認できること**:

- `npm run dev` で単一の開発サーバーが起動
- `http://localhost:3000/` でユーザー向け画面が表示される
- `http://localhost:3000/admin` で管理者画面が表示される
- 管理者画面へのアクセスはログインが必要

## Progress

- [x] Phase 1: 環境準備・Next.js 16 プロジェクト初期化（Next.js 16 テンプレート配置、依存導入、pnpm dev 起動確認まで完了）
- [x] Phase 2: 共通コード移行（lib、types、styles）+ 認証・状態管理の刷新（src/types 追加、Supabase SSR/Proxy と Zustand 基盤を追加、styles を統合）
- [x] Phase 3: コンポーネント移行（ユーザー/管理者のコンポーネントを統合先へ移行し、インポートと状態管理を更新）
- [x] Phase 4: ページ移行（Pages Router → App Router）（ユーザー/管理者ページの App Router 化、Server Actions ログイン、upload Route Handler 作成まで完了）
- [x] Phase 5: Docker・Makefile 更新、動作検証（docker-compose/Makefile の統合版を確認）
- [x] Phase 6: ドキュメント整備、旧コード削除（README 更新、view-user/view-admin/shared の削除を確認）
- [x] (2026-01-16 09:20Z) Dev 動作検証（pnpm dev 起動、/ と /prizes を 200 で確認、ポート競合により 3002 で稼働）
- [x] (2026-01-16 09:30Z) Prod 動作検証（pnpm build 成功、docker-compose.prod.yml 起動、ポート競合を解消して 3000 で起動）

## Surprises & Discoveries

- create-next-app 実行時の対話で Tailwind を選択するプロンプトが出た。テンプレートが app-tw になり、Tailwind 関連の依存と postcss.config.mjs が生成された。
  Evidence: temp-next-app 生成ログ（依存一覧に tailwindcss / @tailwindcss/postcss が含まれる）
- 旧ディレクトリ削除時に .next 配下で権限エラーが発生したが、view-user/view-admin 自体は削除完了。
  Evidence: rm -rf 実行時の Permission denied ログ
- README に存在しない MinIO スクリプトの記載が残っていたため削除した。
  Evidence: README 内の setup-with-new-keys / generate-minio-keys 記載
- 本番ビルド時に `JSX` 名前空間と Supabase Deno 関数の型チェックで失敗した。
  Evidence: Loading コンポーネントの戻り型エラー、supabase-project/volumes/functions/hello/index.ts の import エラー
- ポート 3000 が Supabase Studio によって使用されており、prod コンテナ起動時に競合した。
  Evidence: docker compose 起動時の Bind 失敗ログ

## Decision Log

- Decision: pnpm workspace は使用しない
  Rationale: 単一アプリに統合するため、workspace の利点がない。シンプルさを優先。
  Date/Author: 2026-01-16 / User 確認済み

- Decision: コンポーネントは現状のまま移行し、後で手動整理
  Rationale: 統合作業のスコープを限定し、段階的に改善する方針
  Date/Author: 2026-01-16 / User 確認済み

- Decision: Recoil を廃止し、Zustand に移行
  Rationale: Recoil はメンテナンス終了。Zustand は軽量でシンプル、学習コストも低い
  Date/Author: 2026-01-16 / User 確認済み

- Decision: Supabase 認証を公式推奨方式に変更
  Rationale: @supabase/ssr + Server Actions + proxy.ts を使用。セキュリティとベストプラクティスに準拠
  Date/Author: 2026-01-16 / User 確認済み

- Decision: Next.js 16 + App Router + Turbopack を採用
  Rationale: 最新の Next.js でデフォルトで Turbopack が有効。パフォーマンスと将来性を考慮
  Date/Author: 2026-01-16 / User 確認済み

- Decision: ESLint は Next.js 16 のフラット設定（eslint.config.mjs）を採用
  Rationale: create-next-app の最新テンプレートに合わせ、将来的な互換性を優先
  Date/Author: 2026-01-16 / Copilot

- Decision: Supabase の Deno 関数ディレクトリを TypeScript ビルド対象から除外
  Rationale: Next.js ビルド時に無関係な Deno import が原因で失敗するため。アプリの型検証範囲を明確化。
  Date/Author: 2026-01-16 / Copilot

## Outcomes & Retrospective

Dev/Prod の基本起動とビルド成功を確認。Prod は Supabase Studio の 3000 番ポートを停止して起動する必要がある。

---

## Context and Orientation

### 現在のプロジェクト構造

    nutfes-Bingo/
    ├── view-user/              # ユーザー向けNext.jsアプリ (Pages Router, Next.js 14)
    │   ├── src/
    │   │   ├── pages/          # ページコンポーネント
    │   │   ├── components/     # UIコンポーネント（69ファイル）
    │   │   ├── lib/supabase.ts # Supabaseクライアント
    │   │   ├── hooks/          # カスタムフック
    │   │   ├── state/          # Recoil状態管理（廃止予定→Zustand）
    │   │   └── styles/         # CSSモジュール
    │   ├── package.json
    │   └── next.config.js
    │
    ├── view-admin/             # 管理者向けNext.jsアプリ (Pages Router, Next.js 14)
    │   ├── src/
    │   │   ├── pages/          # ページコンポーネント + API Routes
    │   │   ├── components/     # UIコンポーネント（27ファイル）
    │   │   ├── lib/supabase.ts # Supabaseクライアント（view-userと同一）
    │   │   ├── hooks/          # 空
    │   │   ├── state/          # Recoil状態管理（adminSession）（廃止予定→Zustand）
    │   │   └── styles/         # CSSモジュール
    │   ├── package.json
    │   └── next.config.js
    │
    ├── shared/                 # 共有型定義
    │   └── types/
    │       ├── index.ts
    │       ├── bingo.ts
    │       ├── database.ts
    │       └── mappers.ts
    │
    ├── supabase-project/       # Supabaseバックエンド（変更なし）
    ├── docker-compose.yml      # フロントエンド用Docker設定
    └── Makefile

### 重複しているコード

1. `src/lib/supabase.ts` - 完全に同一
2. 設定ファイル（tsconfig.json, .eslintrc.json, .prettierrc.json）- ほぼ同一
3. 依存関係（@supabase/supabase-js, react, next 等）
4. Recoil（メンテナンス終了のため Zustand に移行）

### 統合後の目標構造

    nutfes-Bingo/
    ├── src/
    │   ├── app/                        # App Router
    │   │   ├── layout.tsx              # ルートレイアウト
    │   │   ├── (user)/                 # ユーザー向けルートグループ（URLに影響なし）
    │   │   │   ├── page.tsx            # / (メインページ)
    │   │   │   ├── prizes/
    │   │   │   │   └── page.tsx        # /prizes
    │   │   │   └── ...
    │   │   ├── admin/                  # 管理者向けルート
    │   │   │   ├── layout.tsx          # 認証チェック用レイアウト
    │   │   │   ├── page.tsx            # /admin
    │   │   │   ├── login/
    │   │   │   │   ├── page.tsx        # /admin/login
    │   │   │   │   └── actions.ts      # Server Actions (login/logout)
    │   │   │   ├── prizes/
    │   │   │   │   └── page.tsx        # /admin/prizes
    │   │   │   └── ...
    │   │   └── api/                    # Route Handlers（API Routes移行）
    │   │       └── upload/route.ts     # ※認証APIはServer Actionsに移行
    │   │
    │   ├── components/
    │   │   ├── user/                   # 旧view-user/src/components
    │   │   └── admin/                  # 旧view-admin/src/components
    │   │
    │   ├── lib/
    │   │   └── supabase/               # Supabaseクライアント（公式推奨構成）
    │   │       ├── client.ts           # ブラウザ用クライアント
    │   │       ├── server.ts           # サーバー用クライアント
    │   │       └── proxy.ts            # セッション更新ロジック
    │   │
    │   ├── types/                      # 旧shared/typesを吸収
    │   │   ├── index.ts
    │   │   ├── bingo.ts
    │   │   ├── database.ts
    │   │   └── mappers.ts
    │   │
    │   ├── stores/                     # Zustand ストア（Recoilから移行）
    │   │   └── useAdminStore.ts        # 管理者セッション用ストア
    │   │
    │   └── styles/                     # スタイル（統合）
    │
    ├── public/                         # 静的ファイル（統合）
    ├── proxy.ts                        # Next.js 16 Proxy（セッション管理）
    ├── package.json                    # 統合された依存関係
    ├── next.config.ts                  # Next.js 16設定
    ├── tsconfig.json
    ├── supabase-project/               # 変更なし
    ├── docker-compose.yml              # 簡素化
    └── Makefile                        # 更新

---

## Plan of Work

### Phase 1: 環境準備・Next.js 16 プロジェクト初期化

**目的**: 統合先となる新しい Next.js 16 プロジェクトをルートディレクトリに作成

**作業内容**:

1. 既存の `view-user`, `view-admin` をバックアップ（Git で追跡されているので不要だが念のため）
2. Next.js 16 プロジェクトを初期化（`npx create-next-app@latest`）
3. pnpm への移行（`npm` → `pnpm`）
4. 基本設定ファイルの作成（tsconfig.json, .eslintrc.json, .prettierrc.json）
5. 共通依存関係のインストール

**成果物**:

- `/src/app/layout.tsx` と `/src/app/page.tsx` が存在
- `pnpm dev` で開発サーバーが起動

### Phase 2: 共通コード移行（lib、types、styles）+ 認証・状態管理の刷新

**目的**: 重複なく共有されるべきコードを移行し、認証・状態管理を最新のベストプラクティスに更新

**作業内容**:

1. `shared/types/` → `src/types/` へ移動
2. Supabase クライアントを公式推奨構成に変更:
   - `src/lib/supabase/client.ts` - ブラウザ用（`createBrowserClient`）
   - `src/lib/supabase/server.ts` - サーバー用（`createServerClient`）
   - `src/lib/supabase/proxy.ts` - セッション更新ロジック
   - `proxy.ts`（ルート）- Next.js 16 Proxy
3. `@supabase/ssr` パッケージのインストール
4. Zustand のインストールと状態管理の移行
5. 環境変数の統合（`.env.local`）
6. スタイルの準備（globals.css 等）

**成果物**:

- `src/lib/supabase/client.ts` からブラウザ用クライアントがエクスポートされる
- `src/lib/supabase/server.ts` からサーバー用クライアントがエクスポートされる
- `src/stores/useAdminStore.ts` から Zustand ストアがエクスポートされる
- 型定義がインポート可能

### Phase 3: コンポーネント移行

**目的**: 両アプリのコンポーネントを新プロジェクトに移行

**作業内容**:

1. `view-user/src/components/` → `src/components/user/`
2. `view-admin/src/components/` → `src/components/admin/`
3. インポートパスの修正
4. CSS モジュールの移行

**注意事項**:

- コンポーネントの統合・リファクタリングは後で手動で行う（今回のスコープ外）
- まずは動作することを優先

### Phase 4: ページ移行（Pages Router → App Router）

**目的**: 両アプリのページを App Router 形式に変換

**作業内容**:

#### 4.1 ユーザー向けページ

`view-user/src/pages/` の各ページを `src/app/(user)/` に移行:

| 旧パス                   | 新パス                       | URL       |
| ------------------------ | ---------------------------- | --------- |
| `pages/index.tsx`        | `app/(user)/page.tsx`        | `/`       |
| `pages/prizes/index.tsx` | `app/(user)/prizes/page.tsx` | `/prizes` |
| 他のページ               | 同様に移行                   |           |

#### 4.2 管理者向けページ

`view-admin/src/pages/` の各ページを `src/app/admin/` に移行:

| 旧パス                   | 新パス                      | URL             |
| ------------------------ | --------------------------- | --------------- |
| `pages/index.tsx`        | `app/admin/page.tsx`        | `/admin`        |
| `pages/login.tsx`        | `app/admin/login/page.tsx`  | `/admin/login`  |
| `pages/prizes/index.tsx` | `app/admin/prizes/page.tsx` | `/admin/prizes` |
| 他のページ               | 同様に移行                  |                 |

#### 4.3 API Routes 移行

`view-admin/src/pages/api/` を `src/app/api/` (Route Handlers) に移行:

| 旧パス                    | 新パス                        |
| ------------------------- | ----------------------------- |
| `pages/api/auth/login.ts` | `app/api/auth/login/route.ts` |
| `pages/api/upload.ts`     | `app/api/upload/route.ts`     |

#### 4.4 状態管理・認証の移行

**Recoil → Zustand 移行**:

1. `view-admin/src/state/adminSession.ts` の状態を `src/stores/useAdminStore.ts` (Zustand) に移行
2. `view-user/src/state/` の状態を必要に応じて Zustand に移行

**認証の移行（Supabase 公式推奨方式）**:

1. `RequireAdmin.tsx` のロジックを `app/admin/layout.tsx` に移行
2. ログイン処理を Server Actions (`app/admin/login/actions.ts`) に移行
3. `proxy.ts` でセッションの自動更新を実装

**Zustand (Recoil 代替) の設計パターン**:

    // src/stores/useAdminStore.ts
    import { create } from 'zustand';
    import { persist } from 'zustand/middleware';

    interface AdminState {
      isAuthenticated: boolean;
      email: string | null;
      setAuthenticated: (email: string) => void;
      logout: () => void;
    }

    export const useAdminStore = create<AdminState>()(
      persist(
        (set) => ({
          isAuthenticated: false,
          email: null,
          setAuthenticated: (email) => set({ isAuthenticated: true, email }),
          logout: () => set({ isAuthenticated: false, email: null }),
        }),
        { name: 'admin-session' }
      )
    );

#### Pages Router → App Router 変換パターン

    // Before (Pages Router)
    import { useRouter } from 'next/router';

    export default function Page() {
      const router = useRouter();
      return <div>...</div>;
    }

    // After (App Router)
    'use client';  // クライアントコンポーネントの場合
    import { useRouter } from 'next/navigation';

    export default function Page() {
      const router = useRouter();
      return <div>...</div>;
    }

### Phase 5: Docker・Makefile 更新、動作検証

**目的**: 統合されたアプリを Docker 環境で動作させる

**作業内容**:

1. `docker-compose.yml` の更新（2 サービス → 1 サービス）
2. `Makefile` の更新
3. ローカル環境での動作テスト
4. 本番用 Docker 設定（`docker-compose.prod.yml`）の更新

**docker-compose.yml 変更後**:

    services:
      web:
        image: node:22-alpine
        container_name: "bingo-web"
        volumes:
          - ./:/app
        working_dir: /app
        command: sh -c "corepack enable && pnpm install && pnpm dev"
        ports:
          - "3000:3000"
        env_file:
          - ./.env
        stdin_open: true
        tty: true

    networks:
      default:
        name: bingo-network
        external: true

### Phase 6: ドキュメント整備、旧コード削除

**目的**: 後継者のためのドキュメントを整備し、不要なコードを削除

**作業内容**:

1. README.md の更新
2. 開発ガイドの更新（SUPABASE_GUIDE.md 等）
3. 旧ディレクトリの削除（`view-user/`, `view-admin/`, `shared/`）
4. `.gitignore` の更新
5. 最終動作確認

---

## Concrete Steps

### Phase 1: 環境準備

    # 作業ディレクトリ: /home/tkymhrt/Develop/nutfes-Bingo

    # 1. pnpmをインストール（未インストールの場合）
    npm install -g pnpm

    # 2. Next.js 16プロジェクトを初期化
    #    - 一時ディレクトリに作成してから移動
    npx -y create-next-app@latest ./temp-next-app \
      --typescript \
      --eslint \
      --tailwind=false \
      --src-dir \
      --app \
      --turbopack \
      --use-pnpm \
      --no-import-alias

    # 3. 必要なファイルをルートに移動
    mv temp-next-app/src ./src
    mv temp-next-app/public ./public.new
    mv temp-next-app/package.json ./package.json.new
    mv temp-next-app/next.config.ts ./next.config.ts
    mv temp-next-app/tsconfig.json ./tsconfig.json.new
    # ...その他の設定ファイル

    # 4. 一時ディレクトリを削除
    rm -rf temp-next-app

### Phase 2〜6: 以降のステップ

（Phase 1 完了後に詳細を記載）

---

## Validation and Acceptance

### Phase 1 完了条件

    # 以下のコマンドが成功すること
    pnpm dev
    # → http://localhost:3000 でNext.jsのデフォルトページが表示される

### 最終完了条件

1. **ユーザー向け画面**: `http://localhost:3000/` でビンゴ画面が表示される
2. **管理者ログイン**: `http://localhost:3000/admin` にアクセスすると `/admin/login` にリダイレクトされる
3. **管理者画面**: ログイン後、`/admin` で管理画面が表示される
4. **ビルド成功**: `pnpm build` がエラーなく完了する
5. **Docker 動作**: `docker compose up` で正常に起動する

---

## Idempotence and Recovery

- 各フェーズは独立して実行可能
- Git でバージョン管理されているため、任意の時点にロールバック可能
- 旧ディレクトリ（`view-user/`, `view-admin/`）は Phase 6 まで削除しない

---

## Artifacts and Notes

### 主要な依存関係（統合後）

    {
      "dependencies": {
        "next": "^16.0.0",
        "react": "^19.0.0",
        "react-dom": "^19.0.0",
        "@supabase/supabase-js": "^2.58.0",
        "@supabase/ssr": "^0.6.0",
        "zustand": "^5.0.0",
        "react-toastify": "^11.0.5",
        "classnames": "^2.5.1",
        "embla-carousel-react": "^8.2.1",
        "framer-motion": "^11.3.30",
        "react-icons": "^4.10.1",
        "react-hook-form": "^7.45.4"
      },
      "devDependencies": {
        "typescript": "^5.5.4",
        "eslint": "^9.0.0",
        "prettier": "^3.2.5",
        "@types/react": "^19.0.0",
        "@types/node": "^22.0.0"
      }
    }

**削除される依存関係**:

- `recoil: ^0.7.7` - メンテナンス終了のため Zustand に移行

### Next.js 16 主要な変更点

- **Turbopack**: デフォルトで有効
- **React 19.2**: View Transitions, useEffectEvent, Activity 対応
- **Cache Components**: `use cache` ディレクティブ
- **proxy.ts**: middleware の代替（ネットワーク境界の明確化）

### Supabase 認証（公式推奨構成）

**なぜ @supabase/ssr を使うのか**:

- Server Components と Client Components で適切にセッションを共有
- Cookie ベースの認証でセキュリティ向上
- `supabase.auth.getUser()` でサーバーサイドでも認証状態を確認可能

**重要なセキュリティ注意事項**:

- サーバーサイドでは `supabase.auth.getSession()` を信頼しない
- 必ず `supabase.auth.getUser()` を使用してトークンを再検証する

---

## Interfaces and Dependencies

### Supabase クライアント（公式推奨構成）

**`src/lib/supabase/client.ts`** - ブラウザ用:

    import { createBrowserClient } from '@supabase/ssr';

    export function createClient() {
      return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }

**`src/lib/supabase/server.ts`** - サーバー用:

    import { createServerClient } from '@supabase/ssr';
    import { cookies } from 'next/headers';

    export async function createClient() {
      const cookieStore = await cookies();

      return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookies) {
              cookies.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            },
          },
        }
      );
    }

**`proxy.ts`** - ルートに配置（セッション自動更新）:

    import { type NextRequest } from 'next/server';
    import { updateSession } from '@/lib/supabase/proxy';

    export async function proxy(request: NextRequest) {
      return await updateSession(request);
    }

    export const config = {
      matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      ],
    };

### 型定義

`src/types/index.ts`:

    export type { NumberRow, ImageRow, PrizeRow, ... } from "./database";
    export type { BingoNumber, PrizeImage, Prize, ... } from "./bingo";
    export { mapNumberRow, mapImageRow, mapPrizeRow, ... } from "./mappers";

### 認証処理（Server Actions）

**`src/app/admin/login/actions.ts`**:

    'use server';

    import { revalidatePath } from 'next/cache';
    import { redirect } from 'next/navigation';
    import { createClient } from '@/lib/supabase/server';

    export async function login(formData: FormData) {
      const supabase = await createClient();

      const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      };

      const { error } = await supabase.auth.signInWithPassword(data);

      if (error) {
        redirect('/admin/login?error=invalid_credentials');
      }

      revalidatePath('/', 'layout');
      redirect('/admin');
    }

    export async function logout() {
      const supabase = await createClient();
      await supabase.auth.signOut();
      revalidatePath('/', 'layout');
      redirect('/admin/login');
    }

### 認証チェック（Admin Layout）

**`src/app/admin/layout.tsx`** - サーバーサイドで認証確認:

    import { redirect } from 'next/navigation';
    import { createClient } from '@/lib/supabase/server';

    export default async function AdminLayout({
      children
    }: {
      children: React.ReactNode
    }) {
      const supabase = await createClient();

      // 重要: getSession()ではなくgetUser()を使用
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        redirect('/admin/login');
      }

      return <>{children}</>;
    }

### Zustand ストア（Recoil 代替）

**`src/stores/useAdminStore.ts`**:

    import { create } from 'zustand';
    import { persist } from 'zustand/middleware';

    interface AdminState {
      // UI状態のみ管理（認証状態はSupabase Cookieで管理）
      sidebarOpen: boolean;
      toggleSidebar: () => void;
    }

    export const useAdminStore = create<AdminState>()(
      persist(
        (set) => ({
          sidebarOpen: true,
          toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        }),
        { name: 'admin-ui' }
      )
    );
