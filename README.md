# nutfes-Bingo
技大祭当日に使うビンゴアプリです。

## Branch命名規則
新機能のBranch名：feature/issue○○/title[isuueの簡単な説明]

修正のBranch名：fix/issue○○/title[issueの簡単な説明]
 
## PR命名規則
新機能：[add] title

編集・修正：[fix] title

削除：[del] title

## 実装メモ
- `next: permission denied`が出る時の対処法
    - `docker compose run --rm [コンテナ名] bash` でそのコンテナに入る
    - `chown +x -R .`　で実行権限を与える
    - `exit`でそのコンテナから出る