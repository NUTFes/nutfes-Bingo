# Supabase 負荷テスト

## 概要

このディレクトリには、Supabase Bingo アプリケーションの負荷テストスクリプトが含まれています。
300〜1000 人の同時接続をシミュレートし、パフォーマンスを検証します。

## テストツール

**k6** を使用しています。

- WebSocket ネイティブサポート
- 軽量で高性能
- 詳細なメトリクス出力

## インストール

```bash
# Ubuntu/Debian
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# macOS
brew install k6

# Docker
docker pull grafana/k6
```

## テストスクリプト

| スクリプト         | 説明                                                              |
| ------------------ | ----------------------------------------------------------------- |
| `rest-api-test.js` | REST API の初期データ取得性能テスト                               |
| `realtime-test.js` | WebSocket Realtime の同時接続テスト                               |
| `combined-test.js` | REST + WebSocket の複合テスト（実際のユーザー行動をシミュレート） |

## 使用方法

### クイックテスト（確認用）

```bash
# 実行権限を付与
chmod +x run-tests.sh

# 全テスト実行（クイックモード: 50 VUs, 2-3分）
./run-tests.sh all --quick

# 個別テスト
./run-tests.sh rest --quick
./run-tests.sh realtime --quick
./run-tests.sh combined --quick
```

### フルテスト（本番検証用）

```bash
# 全テスト実行（フルモード: 最大1000 VUs, 約15分）
./run-tests.sh all --full

# 個別テスト
./run-tests.sh rest --full
./run-tests.sh realtime --full
./run-tests.sh combined --full
```

### 直接 k6 で実行（カスタムパラメータ）

```bash
# 300同時接続で2分間テスト
k6 run --vus 300 --duration 2m rest-api-test.js

# 500同時接続で5分間テスト
k6 run --vus 500 --duration 5m realtime-test.js

# 1000同時接続で5分間テスト
k6 run --vus 1000 --duration 5m combined-test.js
```

### 環境変数

```bash
# ローカル以外のSupabaseをテストする場合
export SUPABASE_URL=https://your-supabase-url.com
export SUPABASE_ANON_KEY=your-anon-key

k6 run rest-api-test.js
```

## テスト閾値

### REST API

- 95%リクエストが 2 秒以内に完了
- 99%リクエストが 5 秒以内に完了
- エラー率が 1%未満

### WebSocket Realtime

- 95%接続が 3 秒以内に確立
- 99%接続が 5 秒以内に確立
- エラー率が 5%未満

## 結果の見方

テスト終了後、`results/`ディレクトリに結果が保存されます。

```
results/
├── rest-api-20260116_010000.log
├── realtime-20260116_010500.log
├── combined-20260116_011000.log
├── rest-api-results.json
├── realtime-results.json
└── combined-results.json
```

### 重要なメトリクス

| メトリクス             | 説明                            | 目標値   |
| ---------------------- | ------------------------------- | -------- |
| `http_req_duration`    | HTTP リクエストのレスポンス時間 | p95 < 2s |
| `ws_connect_time`      | WebSocket 接続確立時間          | p95 < 3s |
| `errors` / `ws_errors` | エラー率                        | < 5%     |
| `http_reqs`            | 総 HTTP リクエスト数            | -        |
| `ws_messages_received` | 受信した WebSocket メッセージ数 | -        |

## トラブルシューティング

### 接続エラーが多い場合

1. Supabase が起動しているか確認

```bash
docker ps | grep supabase
```

2. ファイルディスクリプタ制限を確認・増加

```bash
ulimit -n 65536
```

3. Realtime サービスの`RLIMIT_NOFILE`を増加（docker-compose.yml）

### タイムアウトが多い場合

1. Supavisor のプールサイズを確認
2. PostgreSQL の max_connections を確認
3. Kong のバッファサイズを確認

## 負荷テスト実施時の注意

1. **ローカル環境でのテスト推奨**: 本番環境への影響を避けるため
2. **リソース監視**: テスト中は`docker stats`でコンテナのリソース使用状況を監視
3. **段階的な負荷増加**: いきなり 1000 VUs ではなく、100 → 300 → 500 → 1000 と段階的に
