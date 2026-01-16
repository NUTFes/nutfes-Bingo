---
description: データベース操作の便利コマンド集
---

# データベース操作

## DB 状態確認

// turbo

```bash
make db-status
```

## テーブル一覧を表示

// turbo

```bash
make db-tables
```

## テーブルの詳細（カラム情報）を確認

```bash
make db-schema TABLE=<テーブル名>
```

例:
// turbo

```bash
make db-schema TABLE=numbers
```

## SQL クエリを実行

```bash
make db-query SQL="<SQL文>"
```

例:

```bash
make db-query SQL="SELECT * FROM public.numbers LIMIT 5"
make db-query SQL="SELECT COUNT(*) FROM public.prizes"
```

## PostgreSQL シェルを起動（インタラクティブ）

```bash
make db-shell
```

シェル内で使える便利なコマンド:

- `\dt public.*` - テーブル一覧
- `\d tablename` - テーブル詳細
- `\q` - 終了

## SQL ファイルを実行

```bash
./supabase-project/scripts/db-query.sh -f path/to/file.sql
```
