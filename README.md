# nutfes-Bingo
技大祭当日に使うビンゴアプリです。

# branch名の統一
 - masterブランチ
     - 安定ブランチ，本番用ブランチ
 - developブランチ
     - 開発用ブランチ，開発段階での安定ブランチ，これを公開するときに安定ブランチにマージ
 - feat/[NAME]/[ISUEE_NUM]-[TITLE]
     - 機能の追加や変更などを行うブランチ，developブランチから派生
     - ex) feat/dodo/1-create-view-env
 - fix/[NAME]/[ISUEE_NUM]-[TITLE]
     - バグの修正などを行うブランチ，developブランチから派生
     - ex) fix/dodo/2-fix-view-env
# コミットの命名規則
 - コミットメッセージはissue番号を載せる
 - コミットメッセージは行った開発を端的にわかりやすく書く（長すぎないように注意する）
 - コミットメッセージラベルを付ける
     - [feat] file or directory の追加
     - [fix] file or directory のバグや軽微な修正
 - ex)
     - `git commit -m "[feat] model group (#1)"`
     - `git commit -m "[fix] login page (#2)"`

## 実装メモ
- `next: permission denied`が出る時の対処法
    - `docker compose run --rm [コンテナ名] bash` でそのコンテナに入る
    - `chown +x -R .`　で実行権限を与える
    - `exit`でそのコンテナから出る
