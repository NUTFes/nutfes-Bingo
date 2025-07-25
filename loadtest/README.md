<<<<<<< HEAD
# 🚀 BINGO アプリケーション 負荷試験フレームワーク（共通基盤）

このディレクトリには、BINGOアプリケーション用の負荷試験フレームワークの共通設定と分析ツールが含まれています。

**注意**: 実際の負荷試験ツール（ArtilleryとK6）は、GitHub差分サイズの制限により別ブランチに分離されています。

## 🗂️ ブランチ構成

このプロジェクトは以下の3つのブランチに分離されています：

### 1. `feat/yama/server-testing` (このブランチ)
- **目的**: 共通設定とドキュメント
- **内容**: 環境設定、結果分析ツール、概要ドキュメント

### 2. `feat/yama/artillery-load-testing`
- **目的**: Artillery負荷試験ツール
- **内容**: Artillery統合テスト（3ファイル構成）
- **特徴**: HTTP/WebSocket統合、動的設定生成

### 3. `feat/yama/k6-load-testing`
- **目的**: K6高性能負荷試験ツール
- **内容**: K6統合テスト（4ファイル構成）
- **特徴**: JavaScript実行、WebSocket/HTTP分離テスト

## 📁 共通ファイル構成

```
loadtest/
├── config/                   # 共通設定
│   └── environments.js       # 環境設定
├── results/                  # テスト結果保存
├── analyze-results.sh       # 結果分析スクリプト
└── README.md                # このファイル
```

## 🚀 使用方法

各負荷試験ツールを使用するには、対応するブランチに切り替えてください：

### Artillery負荷試験
```bash
git checkout feat/yama/artillery-load-testing
cd loadtest
./run-tests.sh artillery
```

### K6負荷試験
```bash
git checkout feat/yama/k6-load-testing
cd loadtest
./run-tests.sh unified      # 統合HTTP負荷テスト
./run-tests.sh websocket    # WebSocket負荷テスト
```

### 結果分析（全ブランチ共通）
```bash
./analyze-results.sh
```

## 🎯 負荷試験種類の概要

### Artillery統合負荷試験
- HTTP APIとWebSocketの統合テスト
- 動的設定生成（最大ユーザー数に基づく）
- HTMLレポート生成
- 現実的なユーザー行動パターン

### K6統合負荷試験
- **統合HTTP負荷テスト**: ユーザー行動シミュレーション
- **WebSocket負荷テスト**: リアルタイム通信専用
- JavaScript実行エンジン
- JSON結果出力

## ⚙️ 環境設定

### 対応環境
- **local**: localhost:3000, localhost:8080
- **production**: bingo.nutfes.net, bingo-api.nutfes.net

### 設定オプション
```bash
# 環境指定
-e, --environment ENV    実行環境 (local|production)

# 最大ユーザー数指定
-u, --max-users NUM      最大ユーザー数
```

## 📊 パフォーマンス目標

| 指標 | Artillery目標 | K6目標 |
|------|---------------|---------|
| HTTP平均レスポンス時間 | < 500ms | < 300ms |
| HTTP 95%ileレスポンス時間 | < 1000ms | < 800ms |
| WebSocket接続時間 | < 1000ms | < 500ms |
| エラー率 | < 1% | < 0.5% |

## 🔧 結果分析

共通の結果分析ツール：

```bash
./analyze-results.sh          # 基本分析
./analyze-results.sh evaluate # パフォーマンス判定
./analyze-results.sh list     # 結果ファイル一覧
```

## 📈 メトリクス

### Artillery
- HTTP response time
- WebSocket connection time
- Error rates
- User scenarios

### K6
- HTTP response time
- WebSocket message latency
- Connection errors
- Custom metrics

## 🚧 注意事項

1. **ブランチ分離**: 実際の負荷試験実行には、対応するブランチに切り替えが必要です
2. **依存関係**: 各ブランチで異なる依存関係（Artillery: npm, K6: k6バイナリ）
3. **結果保存**: 結果は各ブランチの`results/`ディレクトリに保存されます

## 🔗 関連PR

- [#338 - 負荷試験フレームワーク（共通基盤）](https://github.com/NUTFes/nutfes-Bingo/pull/338) (このブランチ)
- [#341 - Artillery負荷試験ツール](https://github.com/NUTFes/nutfes-Bingo/pull/341)
- [#342 - K6高性能負荷試験ツール](https://github.com/NUTFes/nutfes-Bingo/pull/342)
=======
# 🚀 BINGO アプリケーション K6負荷試験

このディレクトリには、BINGOアプリケーション用のK6負荷試験ファイルが含まれています。

## 🚀 クイックスタート

### 前提条件

- K6 (最新版推奨)

### K6のインストール

#### Linux (Ubuntu/Debian)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### macOS (Homebrew)
```bash
brew install k6
```

### 実行

```bash
# 基本的な実行
./run-tests.sh

# WebSocket負荷試験
./run-tests.sh websocket

# 統合HTTP負荷試験（ユーザー行動シミュレーション）
./run-tests.sh unified

# デバッグ用WebSocket試験
./run-tests.sh debug-websocket
```

## 📋 負荷試験種類

### 1. WebSocket負荷試験
- WebSocket接続の専用テスト
- リアルタイム通信のパフォーマンス測定
- サブスクリプション機能の検証

### 2. 統合HTTP負荷試験（ユーザー行動シミュレーション）
- 現実的なユーザー行動パターンの再現
- HTTP APIの集中的な負荷テスト
- ページ遷移とAPI呼び出しの組み合わせ
- REST API / GraphQL API の負荷テスト
- レスポンス時間とスループットの測定
- エラー率の監視

### 3. デバッグ用WebSocket負荷試験
- 軽負荷での動作確認
- スクリプトの検証・デバッグ
- 開発時の動作確認

## ⚙️  設定オプション

```bash
# 環境指定
./run-tests.sh -e local websocket

# 最大ユーザー数指定
./run-tests.sh -u 1000 unified

# 本番環境で1000ユーザーの統合テスト
./run-tests.sh -e production -u 1000 unified
```

## 📊 結果の分析

```bash
# 結果分析ツール
./analyze-results.sh

# パフォーマンス判定
./analyze-results.sh evaluate

# 結果ファイル一覧
./analyze-results.sh list
```

## 📁 ディレクトリ構造

```
loadtest/
├── k6/                       # K6テストスクリプト
│   ├── websocket-load-test.js        # WebSocket負荷試験
│   ├── unified-load-test.js          # 統合HTTP負荷試験（ユーザー行動シミュレーション）
│   ├── debug-websocket-test.js       # デバッグ用WebSocket試験
│   └── debug-local-websocket-test.js # ローカル環境デバッグ用
├── config/                   # 共通設定
│   └── environments.js       # 環境設定
├── results/                  # テスト結果保存
├── run-tests.sh             # メイン実行スクリプト
├── analyze-results.sh       # 結果分析スクリプト
└── package.json             # プロジェクト設定
```

## 🎯 テストシナリオ

### WebSocket負荷試験
- GraphQL サブスクリプション
- リアルタイムデータの受信
- 接続維持とメッセージ処理

### 統合HTTP負荷試験（ユーザー行動シミュレーション）
- ビンゴ番号の取得
- 景品情報の取得
- ページロードのシミュレーション
- ユーザー行動パターンの再現
- 段階的な負荷増加
- エラーハンドリングの検証

## 📈 パフォーマンス目標

| 指標 | 目標値 |
|------|--------|
| HTTP平均レスポンス時間 | < 500ms |
| HTTP 95%ileレスポンス時間 | < 1000ms |
| WebSocket接続時間 | < 1000ms |
| WebSocketメッセージ遅延 | < 100ms |
| エラー率 | < 1% |

## 🔧 カスタムメトリクス

K6のカスタムメトリクスを使用して以下を監視：

- `websocket_connection_time`: WebSocket接続時間
- `websocket_message_latency`: メッセージ遅延
- `page_load_time`: ページロード時間
- `api_response_time`: API応答時間

## 🎛️ 閾値設定

各テストスクリプトには適切な閾値が設定されており、テスト結果が目標値を満たしているかを自動判定します。

## 🔧 トラブルシューティング

### よくある問題

1. **K6が見つからない**
   - K6がインストールされているか確認
   - PATHが正しく設定されているか確認

2. **接続エラー**
   - 環境設定を確認してください
   - ネットワーク接続を確認してください

3. **WebSocket接続失敗**
   - WebSocketエンドポイントが正しいか確認
   - 認証設定を確認してください

## 🤝 コントリビューション

1. ブランチを作成
2. テストスクリプトを編集
3. テストを実行して動作確認
4. プルリクエストを作成

## 📄 ライセンス

MIT License
>>>>>>> e09d471 (feat: Add K6専用の負荷試験ツール)
