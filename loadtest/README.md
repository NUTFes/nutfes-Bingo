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
# 🎯 BINGO アプリケーション Artillery負荷試験

このディレクトリには、BINGOアプリケーション用のArtillery負荷試験ファイルが含まれています。

## 🚀 クイックスタート

### 前提条件

- Node.js (v16以上)
- npm

### インストール

```bash
cd loadtest
npm install
```

### 実行

```bash
# 基本的な実行
./run-tests.sh

# 最適化された負荷試験
./run-tests.sh optimized

# 全Artillery負荷試験
./run-tests.sh all
```

## 📋 負荷試験種類

### 1. 基本Artillery負荷試験
- HTTP API とWebSocket の統合テスト
- 標準的な負荷パターン
- ユーザー閲覧シナリオ

### 2. 最適化されたArtillery負荷試験
- 動的設定生成
- 最大ユーザー数に基づくスケーリング
- より現実的なユーザー行動パターン

## ⚙️  設定オプション

```bash
# 環境指定
./run-tests.sh -e local artillery

# 最大ユーザー数指定
./run-tests.sh -u 1000 optimized

# 本番環境で1000ユーザーの最適化テスト
./run-tests.sh -e production -u 1000 optimized
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
├── artillery/                 # Artillery設定ファイル
│   ├── integrated-load-test.yml      # 基本負荷試験設定
│   ├── optimized-user-scenarios.yml  # 最適化シナリオ
│   ├── dynamic-config.js             # 動的設定生成
│   ├── artillery-processor.js        # 基本プロセッサー
│   └── optimized-processor.js        # 最適化プロセッサー
├── config/                    # 共通設定
│   └── environments.js        # 環境設定
├── results/                   # テスト結果保存
├── run-tests.sh              # メイン実行スクリプト
├── analyze-results.sh        # 結果分析スクリプト
└── package.json              # 依存関係設定
```

## 🎯 テストシナリオ

### ユーザー閲覧シナリオ (70%)
- ユーザーページへのアクセス
- ビンゴ番号の取得
- 景品情報の取得

### WebSocket購読シナリオ (30%)
- リアルタイムデータ購読
- WebSocket接続維持
- サブスクリプション管理

## 📈 パフォーマンス目標

| 指標 | 目標値 |
|------|--------|
| HTTP平均レスポンス時間 | < 500ms |
| HTTP 95%ileレスポンス時間 | < 1000ms |
| WebSocket接続時間 | < 1000ms |
| エラー率 | < 1% |

## 🔧 トラブルシューティング

### よくある問題

1. **接続エラー**
   - 環境設定を確認してください
   - ネットワーク接続を確認してください

2. **Artilleryが見つからない**
   ```bash
   npm install -g artillery
   ```

3. **結果ファイルが生成されない**
   - `results/` ディレクトリの権限を確認してください

## 🤝 コントリビューション

1. ブランチを作成
2. 変更を実装
3. テストを実行
4. プルリクエストを作成

## 📄 ライセンス

MIT License
>>>>>>> 5d7c584 (feat: Add Artillery専用の負荷試験ツール)
