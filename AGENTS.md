# Repository Guidelines

## Language / Output（日本語方針）
- 以降の**説明・設計コメント・コードコメント・レビュー指摘・PR/Issue本文・ドキュメント**は、特段の指定がない限り **日本語で記述**してください。
- **識別子（変数名・関数名・型名・GraphQLスキーマ・APIスキーマ・DBスキーマ）**は一貫性のため **英語** を用います。
- **ユーザー向け文言（UIテキスト、バリデーション/エラーメッセージ、トースト等）**は日本語で書き、関連する `i18n` / ロケールファイルを更新してください。
- 例外：外部公開API仕様やOSSへのコントリビューションなど、英語が望ましい場面では英語を用いて問題ありません（その場合でもリポジトリ内の補助説明は日本語可）。
- Codex CLI / エディタ支援ツールを使う場合も、**出力は日本語**になるようプロンプト/AGENTS.mdにこの方針を明記してください。

## Project Structure & Module Organization
- `view-user/`: Next.js app for attendees (user UI). Source in `src/`, pages in `src/pages/`, shared UI in `src/components/`.
- `view-admin/`: Next.js app for admins. Similar structure to user.
- `api/`: Hasura project (GraphQL) with `metadata/`, `migrations/`, and seeds/scripts in `seeds/`.
- `settings/`: Environment files for local and prod (e.g., `bingo.env`, `admin.env`).
- Root: `docker-compose*.yml`, `Makefile`, deployment and utility scripts.

## Build, Test, and Development Commands
- Launch stack: `make run` (builds/starts containers, applies Hasura metadata/migrations).
- Stop stack: `make down`.
- One-shot setup + seed: `make setup` (runs, generates MinIO keys, restarts, seeds).
- Codegen (GraphQL): `make codegen` or `make codegen/user`, `make codegen/admin`.
- Frontend dev: `cd view-user && npm run dev`, `cd view-admin && npm run dev`.
- Frontend build: `npm run build` (in each app). Lint: `npm run lint` or `npm run lint:fix`.

## Coding Style & Naming Conventions
- Language: TypeScript for Next.js apps; GraphQL for data layer via Hasura.
- Style: ESLint + Prettier (2-space indent, semver-compatible configs). Run `npm run lint` before PRs.
- Components: PascalCase for React components and file names. Hooks/atoms: camelCase.
- Branches: `feature/issueNN/title`, `fix/issueNN/title` (see README).

## Testing Guidelines
- No dedicated test suite in this repo yet. Validate via TypeScript checks and `npm run build` in both apps.
- Prefer adding small unit tests colocated with components if introducing logic (e.g., `Component.test.tsx`).

## Commit & Pull Request Guidelines
- Commits: concise, imperative. Prefix style aligns with PR naming: `[add] ...`, `[fix] ...`, `[del] ...` when appropriate.
- PRs: include summary, linked issues, before/after screenshots for UI changes, and steps to verify.
- Keep changes scoped; update locale files and GraphQL codegen when touching UI/data contracts.

## Security & Configuration Tips
- Manage secrets via `settings/*.env`. For MinIO credentials, run `make generate-minio-keys` (updates envs and creates buckets).
- After schema changes, run `make db-apply` to apply Hasura metadata/migrations.

## Architecture Overview
- Two Next.js frontends (admin/user) talk to Hasura GraphQL. Real-time features use Apollo subscriptions. Assets (e.g., prize images) are stored via MinIO.
