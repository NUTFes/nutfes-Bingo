# Cloudflare Access を Admin / Screen 人員認可の唯一の正本にする

## 目的

現在は Cloudflare Access の application/policy で利用者を許可した後、Worker の `ADMIN_EMAILS` / `SCREEN_EMAILS` でも同じ人員を照合している。人員追加のたびに Access 設定、private deploy env、Worker deploy が必要になり、二つの名簿がずれると正しい利用者も拒否される。

変更後は、人員 membership を Cloudflare Access の既存 Admin policy / Screen policy だけで管理する。Worker は引き続き `Cf-Access-Jwt-Assertion` の署名、issuer、application AUD、有効期限、`email`、`sub` を検証する。Admin と Screen は別 Access application・別 AUD のままとし、Screen token で Admin API を利用できない境界を維持する。

人員追加では Access policy、またはその policy が既に参照する reusable group だけを変更し、Git、deploy env、Worker deploy は不要とする。

## 現状と削除対象

認可の二重管理は `worker/access.ts` にある。`requireAdmin` / `requireScreen` は Access JWT 検証に加えて `ADMIN_EMAILS` / `SCREEN_EMAILS` を照合している。この Worker-side roster check を削除する。

同時に、roster のために存在している deploy surface も削除する。

- `wrangler.jsonc` の `ADMIN_EMAILS` / `SCREEN_EMAILS`
- `scripts/deploy-cloudflare.sh` の roster `--var`
- `scripts/preflight-cloudflare.sh` の roster 必須・形式検査
- `cloudflare.deploy.production.env.example`
- `.cloudflare.deploy.production.env` の存在・permission・source 処理

private deploy env に残っていた `STAMP_DAILY_LIMIT` の可変 override も廃止し、Worker 内の `25_000` 定数へ固定する。不要になる Worker binding、parser、`0` による停止分岐も削除する。stamp / reach を緊急停止する既存の `optional-public-mutations` WAF rule は変更しない。

Access application の AUD は現在 Admin / Screen 各1個なので、複数値対応は削除する。`parseStringList`、`trimNonEmptyEntries`、AUD 用 `Set`、JSON/区切り文字対応は不要にし、期待 AUD は単一 `string` として `jose` に渡す。

## 残す安全境界

次は削除しない。

- Cloudflare Access edge の Admin / Screen policy
- Admin application と Screen application の分離
- Admin AUD と Screen AUD が同一なら fail closed にする検査
- `Cf-Access-Jwt-Assertion` の長さ検査
- `jose` による RS256 signature verification
- issuer verification
- audience verification
- expiration verification
- `email` / `sub` required claim verification
- 空白 email、空 `sub` の拒否
- Admin actor 用 email の trim + lowercase normalization
- Access team domain の HTTPS / hostname validation
- `createRemoteJWKSet` と既存 JWKS cache
- local bypass の loopback 制限と local actor validation

Worker-side roster がなくなるため、この module から roster 不一致用の 403 と `permissionMessage` は削除する。Access policy による membership 拒否は Worker 到達前に行われる。

Admin / Screen 別の test-only verifier と config 型は同じ処理の別名なので削除し、共有 `verifyAccessAssertion` だけをテストする。実際の役割境界は `requireAdmin` / `requireScreen` が選ぶ AUD と、Admin / Screen AUD 同一時の fail-closed 検査で確認する。

## 実装内容

### 1. Worker Access verification を最小化する

`worker/access.ts` は Admin / Screen 別の verifier wrapper を持たず、`verifyAccessAssertion` へ `{ issuer, audience }` を直接渡す形にする。

`requireAdmin` は `env.ACCESS_AUD`、`requireScreen` は `env.SCREEN_ACCESS_AUD` を単一 audience として使う。空文字は 503 とする。Screen 側では Admin / Screen の trimmed AUD が一致すれば 503 とする。

`verifyAccessAssertion` は `jwtVerify` に `audience: config.audience` を渡し、検証後は normalized email と `sub` の妥当性だけを確認して identity を返す。email membership check は行わない。

`test/access.test.ts` では config から `allowedEmails` を削除する。既存の署名・issuer・expiration・wrong AUD tests を維持し、以下を明示する。

- 正しい Admin JWT は任意の valid email で成功し lowercase に正規化される
- 正しい Screen JWT は Screen audience で成功する
- Admin AUD token は Screen audience で失敗する
- Admin / Screen AUD が同一なら `requireScreen` が fail closed する
- wrong issuer / wrong AUD / expired / untrusted signature は失敗する
- 空 email / 空 `sub` は失敗する

### 2. roster と private deploy env を削除する

`wrangler.jsonc` から `ADMIN_EMAILS` / `SCREEN_EMAILS` / `STAMP_DAILY_LIMIT` を削除する。stamp daily limit は Worker 内の `25_000` 定数だけを正本とする。

`scripts/deploy-cloudflare.sh` から次を削除する。

- `.cloudflare.deploy.production.env` の source
- `STAMP_DAILY_LIMIT` override の読み出し
- `ADMIN_EMAILS` / `SCREEN_EMAILS` の `--var`
- `STAMP_DAILY_LIMIT` の `--var`

`scripts/preflight-cloudflare.sh` から次を削除する。

- private deploy env の存在確認
- mode 400/600 の permission check
- private deploy env の source
- roster 必須チェック
- roster JSON / email validation
- deploy-time `STAMP_DAILY_LIMIT` validation

Admin/Screen 同一 AUD、Access team domain、Turnstile test key、Git / account / R2 / secret / dependency / Worker validation は維持する。

`cloudflare.deploy.production.env.example` は用途がなくなるため削除する。ignored の実ファイルは repository 管理外なので実装では編集しない。以後の deploy はそのファイルを参照しない。

`pnpm run worker:types` で `worker-configuration.d.ts` を再生成し、`ADMIN_EMAILS` / `SCREEN_EMAILS` が `Env` から消えたことを確認する。

### 3. 運用文書を一つの認可モデルへ合わせる

`README.md` と `docs/cloudflare-operations.md` から Worker email allowlist と private deploy env の説明を削除する。

運用上は次だけを明記する。

- Admin / Screen は別 Access application と別 AUD を使う
- membership の正本は各 Access policy、または既存 reusable group
- 人員追加・通常削除に Git / env / Worker deploy は不要
- 両役割が必要な人は両 policy に所属させる
- Screen policy だけの利用者は Admin application に入れない
- 通常削除は Access policy から identity を外す
- 即時失効が必要な場合だけ Cloudflare Access の session revoke を使う

session revoke automation、Worker denylist、新しい roster / group 管理機構は追加しない。

## Validation

実装後は repository root で次を実行する。

```bash
pnpm test -- test/access.test.ts
pnpm run worker:types
rg --hidden --glob '!node_modules/**' --glob '!.git/**' 'ADMIN_EMAILS|SCREEN_EMAILS|allowedEmails|parseStringList|trimNonEmptyEntries' .
pnpm fmt:check
pnpm lint
pnpm typecheck
pnpm test
pnpm knip
mise run cloudflare:check
```

`rg` は ExecPlan 内の過去名称を除き、runtime code、tests、config、scripts、tracked docs に active reference がないことを期待する。

受け入れ条件は次のとおり。

- valid Admin JWT の email が repository / env に未登録でも成功する
- valid Screen JWT は Screen AUD でのみ成功する
- wrong issuer / AUD / signature / expiration は拒否される
- 空 email / 空 `sub` は拒否される
- Admin actor email normalization が維持される
- `ADMIN_EMAILS` / `SCREEN_EMAILS` が Worker bindings と deploy interface から消える
- `.cloudflare.deploy.production.env` がなくても preflight / deploy の構成が成立する
- Admin / Screen AUD equality は引き続き fail closed
- project standard validation がすべて exit code 0

frontend JSX、routing UI、アクセシビリティ挙動は変更しないため、この変更単体では新しい UI / a11y 対応は発生しない。既存の安全性・入力 validation は上記以外削除しない。

## Rollout / rollback

production rollout 前に Cloudflare dashboard で既存 Admin / Screen application の path、AUD、policy membership を確認し、現在利用できている人を誤って外さない。

通常の release 手順を使う。

```bash
mise run preflight
mise run deploy
mise run smoke
```

`smoke` では未認証 `/admin*` / `/screen*` がそれぞれ正しい Access application へ redirect される既存確認を維持する。人員 membership 自体は Cloudflare Access policy の責務なので、追加時は policy 変更後に対象利用者が正しい application へ login できることを確認する。

code-only regression は Worker version rollback または以前の Git commit の再deploy を使う。この変更は Durable Object schema / data を変更しないため PITR は不要。Access membership の誤変更は code rollback ではなく Access policy を元へ戻す。

旧 commit の再deploy が旧 private roster を要求する可能性はあるが、そのために現行 deployment mechanism へ stale roster や private env を温存しない。必要なら旧 commit 当時の release 手順として扱う。
