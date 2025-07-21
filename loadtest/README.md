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
