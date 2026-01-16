---
description: Supabaseのセットアップと起動方法
---

# Supabase セットアップ

## 初回セットアップ

// turbo

```bash
make setup
```

## Supabase を起動

// turbo

```bash
make supa-up
```

起動後、ストレージバケットを設定:
// turbo

```bash
./supabase-project/scripts/db-setup.sh
```

## Supabase を停止

// turbo

```bash
make supa-down
```

## DB を完全リセット（データ全削除）

```bash
make supa-reset
```

## アクセス先

- Supabase Studio: http://localhost:3000
- Kong API: http://localhost:8000
