# nutfes-Bingo

技大祭当日に使うビンゴアプリです。ユーザー画面と管理画面を単一の Next.js アプリに統合しています。

## Branch 命名規則

新機能の Branch 名：feature/issue○○/title[isuue の簡単な説明]

修正の Branch 名：fix/issue○○/title[issue の簡単な説明]

## PR 命名規則

新機能：[add] title

編集・修正：[fix] title

削除：[del] title

## セットアップ

### 基本的なセットアップ

```bash
make setup
```

### フロントエンドのみ起動

```bash
pnpm install
pnpm dev
```

起動後に以下へアクセスします。

- http://localhost:3000/ （ユーザー画面）
- http://localhost:3000/admin （管理画面）

## 実装メモ

- `next: permission denied`が出る時の対処法
  - `docker compose run --rm [コンテナ名] bash` でそのコンテナに入る
  - `chown +x -R .`　で実行権限を与える
  - `exit`でそのコンテナから出る
