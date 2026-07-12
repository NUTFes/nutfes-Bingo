# WebSocketプロトコル

すべてのメッセージはUTF-8 JSONです。4 KiBを超えるクライアントメッセージはclose code `1009`で拒否します。不正または拒否されたメッセージが3回に達すると、`1008`で接続を切断します。

## エンドポイント

| エンドポイント                          | Object                         | クライアントの役割                 |
| --------------------------------------- | ------------------------------ | ---------------------------------- |
| `/api/ws`                               | `BingoRoom`                    | 参加者、会場、読み取り専用の管理者 |
| `/api/reactions/ws?role=client`         | 選択された`ReactionRoom` shard | 参加者側の送信                     |
| `/api/reactions/ws?role=screen&shard=N` | 指定した`ReactionRoom` shard   | 会場側の受信                       |

会場画面は`/api/session`の`reactionShards`で返されたすべてのshardに対して、リアクション接続を1つずつ開きます。

## Bingo接続

### 初回接続

`lastVersion`を付けずに接続します。

```text
GET /api/ws
Connection: Upgrade
Upgrade: websocket
```

BingoRoomは直ちに完全なsnapshotを返します。

```json
{
  "type": "snapshot",
  "version": 100,
  "eventId": "2026",
  "numbers": [{ "id": 1, "number": 15 }],
  "latestNumber": 15,
  "reachCount": 10,
  "survey": { "active": false, "url": "" },
  "prizes": [],
  "flags": {
    "reactionsEnabled": true,
    "reachSubmissionEnabled": true,
    "surveyEnabled": true,
    "adminWritesEnabled": true,
    "readOnlyMode": false
  }
}
```

### 再開

クライアントは最後に適用したversionをメモリに保持し、次の形式で再接続します。

```text
GET /api/ws?lastVersion=100
```

- `101..current`の全イベントが最大256件の履歴内に残っている場合、BingoRoomは昇順で送信します。
- 履歴が不足している、連続していない、またはクライアントのversionが先行している場合、BingoRoomはsnapshotを送信します。
- クライアントがすでに最新の場合、状態メッセージは不要です。クライアントは最後のsnapshotを保持します。
- 接続後にクライアントから`{"type":"resync","lastVersion":100}`を明示的に送信することもできます。

SPAの再接続待機時間は指数的に増加し、最大30秒、0.75〜1.25倍のjitterを加えます。自動HTTPポーリングは行いません。

## Bingo deltaメッセージ

すべてのdeltaには、状態変更と同じSQLite transaction内でcommitされたversionが含まれます。

### 番号の追加

```json
{ "type": "number.added", "version": 101, "payload": { "id": 2, "number": 42 } }
```

### 番号の更新

```json
{ "type": "number.updated", "version": 102, "payload": { "id": 2, "number": 43 } }
```

### 番号の削除

```json
{ "type": "number.deleted", "version": 103, "payload": { "id": 2, "number": 43 } }
```

### 全番号のリセット

```json
{ "type": "numbers.reset", "version": 104, "payload": {} }
```

### リーチ数の変更またはリセット

```json
{ "type": "reach.updated", "version": 105, "payload": { "count": 11 } }
```

```json
{ "type": "reach.reset", "version": 106, "payload": { "count": 0 } }
```

### アンケート

```json
{
  "type": "survey.updated",
  "version": 107,
  "payload": { "active": true, "url": "https://example.com/survey" }
}
```

### 景品

景品一覧は小さく、作成、更新、削除、並び替えによって複数の表示位置が変化する可能性があるため、景品操作時は一意に並べた完全な景品一覧を送信します。

```json
{
  "type": "prizes.updated",
  "version": 108,
  "payload": [
    {
      "id": 1,
      "nameJa": "景品",
      "nameEn": "Prize",
      "imageKey": "prizes/uuid.webp",
      "imageUrl": "/api/prize-images/prizes%2Fuuid.webp",
      "isWon": false,
      "sortOrder": 0
    }
  ]
}
```

### 機能フラグ

```json
{
  "type": "flags.updated",
  "version": 109,
  "payload": {
    "reactionsEnabled": false,
    "reachSubmissionEnabled": true,
    "surveyEnabled": true,
    "adminWritesEnabled": true,
    "readOnlyMode": false
  }
}
```

### イベント初期化

```json
{
  "type": "event.initialized",
  "version": 110,
  "payload": {
    "type": "snapshot",
    "version": 110,
    "eventId": "2026",
    "numbers": [],
    "latestNumber": null,
    "reachCount": 0,
    "survey": { "active": false, "url": "" },
    "prizes": [],
    "flags": {
      "reactionsEnabled": true,
      "reachSubmissionEnabled": true,
      "surveyEnabled": true,
      "adminWritesEnabled": true,
      "readOnlyMode": false
    }
  }
}
```

`event.initialized`は初期化後の完全snapshotをpayloadに含みます。クライアントはこのsnapshotを同じversionの状態として原子的に適用し、追加のHTTP取得には依存しません。version gapまたは不正なpayloadを検出した場合は、`lastVersion`なしで再接続して完全snapshotを取得します。現在versionより古いsnapshotとdeltaは破棄します。

## Heartbeat

ランタイムは、hibernate中のObjectを起動せずにプロトコルレベルのping/pong frameを処理します。ブラウザからも接続中に25秒ごとにapplication heartbeatを送信します。

```json
{ "type": "ping" }
```

応答:

```json
{ "type": "pong", "version": 110 }
```

application heartbeatのトラフィックは無料枠の試算に含めています。

## リアクションプロトコル

### 送信

```json
{ "type": "reaction", "name": "heart" }
```

許可される名前:

```text
angry cracker crap good heart peace sad skull smile surprise
```

成功応答:

```json
{ "type": "reaction.accepted", "at": 1783754000000 }
```

会場向けメッセージ。envelopeは将来の100〜250 ms単位のbatch送信にも対応できる形式です。

```json
{
  "type": "reaction.batch",
  "reactions": [{ "name": "heart", "at": 1783754000000 }]
}
```

リアクション状態は一時的なものです。過去のリアクションは永続化しません。

## エラーとclose code

アプリケーションエラー:

```json
{ "type": "error", "code": "invalid_message", "message": "Invalid WebSocket message" }
```

リアクション拒否:

```json
{ "type": "error", "code": "reaction_rejected", "message": "Reaction rate limit exceeded" }
```

| Code   | 意味                                       |
| ------ | ------------------------------------------ |
| `1000` | クライアントによる正常終了                 |
| `1003` | クライアントが不正なサーバーJSONを拒否     |
| `1008` | ポリシー違反または不正メッセージの繰り返し |
| `1009` | メッセージが4 KiBを超過                    |
| `1011` | サーバー側のbroadcast失敗                  |

## Hibernationからの復帰

両方のObject classで`DurableObjectState.acceptWebSocket()`を使用します。接続メタデータは`serializeAttachment()`でシリアライズし、Hibernationからの復帰後に`deserializeAttachment()`で復元します。接続中のsocketは`getWebSockets()`で列挙します。信頼できる状態とレート制限はprocess memoryではなくSQLiteから取得します。
