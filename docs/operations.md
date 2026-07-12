# 運用手順

## 初回本番デプロイ前

1. Cloudflareアカウントとzoneを作成または選択します。
2. 非公開R2 bucketを作成します。
   - `nutfes-bingo-images-preview`
   - `nutfes-bingo-images-production`
3. `wrangler.jsonc`内の`PUBLIC_ORIGIN` placeholderを、実際のpreviewおよびproduction originへ置き換えます。
4. 次のパスを対象にCloudflare Accessのself-hosted applicationを作成します。
   - `/admin/*`
   - `/api/admin/*`
5. 少数の管理者groupを対象とするAllow policyを追加します。productionでbypass policyを使用してはいけません。
6. `wrangler secret put --env production`を使用して`COOKIE_SIGNING_SECRET`、`ACCESS_AUD`、`ACCESS_TEAM_DOMAIN`を保存します。
7. GitHub Environment `production`を作成し、required reviewerを有効化して次を追加します。
   - secrets: `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`COOKIE_SIGNING_SECRET`、`ACCESS_AUD`、`ACCESS_TEAM_DOMAIN`
   - variable: `PRODUCTION_URL`
8. API tokenを対象アカウントに限定し、Workers Scripts edit、Workers R2 Storage edit、およびWranglerに必要な最小限のaccount/zone read権限だけを付与します。Global API Keyは使用しません。
9. 1回デプロイします。Wranglerによって`v1` SQLite Durable Object migrationが適用されます。
10. R2 bucketが`r2.dev`公開URLを提供していないことを確認します。

## 個人検証環境

`personal`はproduction／previewとresource名、event ID、R2 bucket、Custom Domainを共有しません。

```bash
pnpm exec wrangler r2 bucket create nutfes-bingo-images-personal
pnpm build:personal
pnpm exec wrangler deploy --dry-run --env personal
pnpm exec wrangler secret bulk <秘密情報JSON> --env personal
pnpm exec wrangler deploy --env personal
SMOKE_URL=https://bingo-test.tkymhrt.dpdns.org pnpm test:smoke
```

- Worker: `nutfes-bingo-personal`
- R2: `nutfes-bingo-images-personal`
- Custom Domain: `bingo-test.tkymhrt.dpdns.org`
- Durable Objects: personal Workerの`BingoRoom`／`ReactionRoom` binding
- GitHub Environment: `personal-test`
- R2の`r2.dev`、Public Development URL、S3 Access Keyは有効化しません。
- destructiveな`event.initialize`は`ENVIRONMENT=personal`とhostnameを再確認してから実行します。

### 個人検証の手動確認

1. PC通常browserで`/`、`/screen`、`/prizes`を開き、Accessへredirectされないことを確認します。
2. secret browserで`/admin`を開き、One-time PINを本人の許可メールアドレスへ送信します。
3. 認証後に管理画面と`/api/admin/session`が成功し、別メールアドレスが拒否されることを確認します。
4. 番号の追加・更新・削除、リーチ重複防止、リアクションbroadcastを確認します。
5. JPEG、PNG、WebP景品を作成し、2 MiB超過とMIME/signature不一致が拒否されることを確認します。
6. 景品画像更新・景品削除後に、古いR2 objectがcleanupされることを確認します。
7. survey開始／停止、全feature flag、`readOnlyMode`、`adminWritesEnabled`を確認します。
8. personal hostnameと`ENVIRONMENT=personal`を再確認し、`event.initialize`を実行します。
9. 初期化後に番号、景品、リーチ、survey、reaction budgetが初期状態へ収束し、R2 objectが残っていないことを確認します。
10. スマートフォンとモバイル回線で公開ページを開き、PCとの同期、画面回転、言語／theme切替を確認します。
11. 両端末でnetworkを切断・復旧し、再読み込みなしでsnapshotとreaction接続が回復することを確認します。

ロールバックは`pnpm exec wrangler versions list --env personal`でversionを確認し、`pnpm exec wrangler rollback <VERSION_ID> --env personal`を実行します。環境を廃止する場合はCustom Domainを解除してからWorkerを削除し、R2 objectとDurable Objectデータは保全要否を確認して別々に削除します。コードのロールバックだけではR2／Durable Objectデータは復元されません。

## イベント前チェックリスト

### 1〜4週間前

```bash
mise install
mise run install
pnpm check
pnpm build:production
pnpm exec wrangler deploy --dry-run
```

- Cloudflare Freeプランの上限と製品価格に変更がないことを確認します。
- `EVENT_ID`が対象年・イベントの識別子であることを確認します。
- `REACTION_SHARDS=4`、または選択した検証済みshard数であることを確認します。
- Access applicationの`AUD`がWorker secretと一致していることを確認します。
- team domainとAccess JWKS endpointへ接続できることを確認します。
- `COOKIE_SIGNING_SECRET`はイベント前にだけrotationします。rotationすると参加者のリーチ・リアクション識別子が無効になります。
- 代表的なJPEG、PNG、WebPをアップロードし、2 MiB超のファイルやMIME/signatureが一致しないファイルが拒否されることを確認します。
- 番号の追加、更新、削除、リセット、リーチ操作、アンケート、景品のlifecycle、全機能フラグ、イベント初期化を検証します。
- ローカルまたは明示的に承認されたpreview環境に対して1,000接続負荷試験を実行します。書面による許可なくproductionを対象にしてはいけません。

### イベント当日の事前確認

1. private browserでAccessを経由して`/admin`を開きます。
2. 会場ディスプレイで`/screen`を開きます。
3. 参加者端末で`/`を開き、別tabで`/prizes`を開きます。
4. **イベントを初期化**を選び、`RESET`と入力します。番号、リーチ、景品、景品画像、アンケート状態、レート制限、リアクション上限が削除されます。
5. 次のフラグを確認します。
   - `reactionsEnabled=true`
   - `reachSubmissionEnabled=true`
   - `surveyEnabled=true`
   - `adminWritesEnabled=true`
   - `readOnlyMode=false`
6. テスト番号を1件追加して削除します。再読み込みせずに参加者画面と会場画面が更新されることを確認します。
7. リーチとリアクションを1回ずつ送信し、会場画面の数値・アニメーションを確認します。
8. Worker、Durable Object、R2 dashboardにエラーがないことを確認します。
9. 参加者を受け入れる前に、テストデータを再度リセットします。

## イベント開始時

- 管理者tabと読み取り専用の参加者tabを、異なる端末・networkで1つずつ維持します。
- 会場画面のBingoとReactionsの状態表示が緑色であることを確認します。
- **現在の状態**から開始時のversionを記録します。
- 復旧に必要な場合を除き、全クライアントを同時に再読み込みしません。

## イベント中

### 通常の抽選

- 抽選のたびに番号追加を使用します。
- 誤りは番号更新で修正し、削除する場合は選択した行だけを削除します。
- イベント開始後は全番号リセットを避けます。
- Worker request数、Durable Objectのrequest数・duration・SQLite row数、およびerror logを監視します。

### アンケート

- HTTPS URLだけを保存します。
- 準備が整ってから公開し、回答受付終了後に停止します。
- `surveyEnabled=false`は縮退運転用のswitchで、保存済みのactive状態より優先されます。

### 景品操作

- 画像はJPEG、PNG、WebPのいずれかで、2 MiB以下である必要があります。
- 当選履歴が必要な場合は景品を削除せず、当選済みに変更します。
- 上下操作で並べ替えます。すべてのクライアントで表示順は一意に決まります。

## 縮退運転手順

機能を保護する優先順位は、番号表示、番号管理、会場表示、リーチ、アンケート、リアクションの順です。

1. **リアクションの負荷上昇またはエラー**: `reactionsEnabled=false`にします。すべてのReactionRoom shardへ反映され、BingoRoomには影響しません。
2. **アンケートの問題**: `surveyEnabled=false`にします。
3. **リーチの負荷上昇**: `reachSubmissionEnabled=false`にします。管理者のリーチ操作は引き続き使用できます。
4. **安全でない書き込みまたは広範な障害**: `readOnlyMode=true`にします。既存のSQLite状態、snapshot、静的asset、接続済みreaderは利用を継続でき、フラグ以外のすべての書き込みを拒否します。
5. 読み取りを維持したまま管理者の書き込みだけを停止する場合は、`adminWritesEnabled=false`にします。

`adminWritesEnabled`を無効にした後、再度有効にする必要があるか判断する前に管理画面から移動しないでください。復旧可能にするため、機能フラグの更新は意図的に許可されたままです。

## 接続障害

- クライアントは指数バックオフとjitterを使用して自動再接続します。
- 接続済みクライアントは最後のsnapshotを保持したまま、offline状態を表示します。
- **再同期**ボタンから`GET /api/state`を1回だけ呼び出します。自動HTTPポーリングはありません。
- リアクションの状態だけが赤い場合、番号抽選を継続し、リアクションを無効にします。
- Bingoの状態が赤い場合、少なくとも管理画面と会場画面が再同期するまで番号変更を停止します。
- Workers Logsで構造化された`request.failed` entryとDurable Object metricsを確認します。

## 無料枠上限への接近時

- Reaction shardはそれぞれ4,000件、4 shard合計16,000件のリアクションを受け付けると自動停止します。
- Durable Object requestが1日上限の70%に近づいた時点で、先にリアクションを無効にします。
- 重要な1日上限の80%に達した場合、トラフィックへの影響があるリーチ送信とアンケートも無効にします。
- イベント終了まで番号の読み取り・書き込みを優先して維持します。
- Freeプランでは、上限超過分が自動的に有料課金されるのではなく、超過した種類のoperationが失敗します。dashboardの警告を上限到達前の障害として扱います。

## イベント終了時

1. `reactionsEnabled=false`にして、アンケートを停止します。
2. **現在の状態**を展開し、保存が必要な場合はJSONを承認済みイベントarchiveへ保存します。
3. 必要な景品の元画像を個別にダウンロードします。公開bucket一覧・export endpointはありません。
4. 最終version、番号順、リーチ数、当選済み景品を記録します。
5. WorkerとDurable Objectのエラーおよび使用量を確認します。
6. archiveの承認後にだけ**イベントを初期化**を使用します。景品メタデータとR2 objectも削除されます。
7. `/api/state`が空の番号・景品一覧とリーチ数0を返すことを確認します。

## ロールバック

- Workerコード: `wrangler versions list`でversionを確認し、`wrangler rollback <VERSION_ID>`を実行します。
- SQLiteデータ: イベント初期化前であれば、Cloudflareが提供するDurable Objects Point-in-Time Recoveryの手順で復旧します。
- 削除済みのサーバー・データベース構成へはロールバックしません。schemaとruntimeに互換性がありません。
- コードのロールバックでは、R2 objectやSQLiteデータは自動的に戻りません。ロールバック前にprotocol・schemaの互換性を確認します。
