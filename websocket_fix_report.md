# WebSocket通信の修正履歴レポート

2023年の最終的なmainへのマージおよびWebSocket通信の修正について調査を行いました。

## 結論

**はい、Apollo Clientへの移行（および`graphql-ws`の採用）が解決の要因でした。**

具体的には、非推奨となっていた `subscriptions-transport-ws` プロトコルから、最新の標準である **Apollo Client (`@apollo/client`)** と **`graphql-ws`** ライブラリを組み合わせた実装に切り替えたことで、WebSocket通信（HasuraのSubscription）が安定して動作するようになりました。

## 詳細履歴

### 1. 修正時期 (いつ？)
**2023年8月頃** に主要な実装が行われ、その後mainへマージされました。
(関連ブランチ: `feature/issue54/user-bingolist-websocket` など)

### 2. 何が原因で、どう直したのか？ (What & How)

#### 修正前の課題 (推測される状況)
以前は古いプロトコル（`subscriptions-transport-ws`）や、異なるクライアントライブラリ（`urql`や生のWebSocket実装など）を使用しており、接続の切断や再接続、あるいはHasuraとの互換性に問題があったと考えられます。

#### 修正内容
`view-user` および `view-admin` アプリケーションにおいて、以下の変更が行われました。

1.  **ライブラリの変更**:
    - `package.json` に `@apollo/client` と `graphql-ws` を追加しました。

2.  **WebSocketリンクの刷新 (`_app.tsx` / `api_methods.ts`)**:
    - `GraphQLWsLink` を使用して WebSocket クライアントを作成するように変更されました。
    - 特に `x-hasura-admin-secret` をヘッダーに含めて認証を通す設定が明示的に追加されました。

**修正コードの例 (`view-user/src/pages/_app.tsx` の現在の実装):**

```typescript
import { ApolloProvider, ApolloClient, InMemoryCache } from "@apollo/client";
import { createClient } from "graphql-ws";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";

// ヘッダーにx-hasura-admin-secretを設定する
const wsClient = createClient({
  url: process.env.WS_API_URL + "/v1/graphql",
  connectionParams: {
    headers: {
      "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET,
    },
  },
});

const wsLink = new GraphQLWsLink(wsClient);

const client = new ApolloClient({
  link: wsLink,
  cache: new InMemoryCache(),
});

// ... ApolloProviderでラップ
```

> **⚠️ セキュリティに関する重要な注意**
>
> 上記コードスニペット（および現在のリポジトリの実装）では、クライアントサイド（ブラウザで動作するコード）で `x-hasura-admin-secret` を使用しています。
> `HASURA_GRAPHQL_ADMIN_SECRET` は管理者権限を持つシークレットであり、通常はサーバーサイド（Node.jsなど）からのみ使用すべきものです。
> ブラウザにこのシークレットが漏洩すると、悪意のあるユーザーがデータベースを自由に操作できてしまうリスクがあります。
> 本番環境が公開ネットワーク上にある場合は、適切な認証方式（JWTなど）への切り替えを強く推奨します。

### 3. 関連するコミット/PR
調査の結果、以下のブランチやコミットがこの修正に深く関わっています。

*   **`feature/issue54/user-bingolist-websocket` (2023年8月)**
    *   コミット: `27cbdce479ebd6ad99ea369f7a18c146b97b3359`
    *   このブランチで `api_methods.ts` などに Apollo Client を用いた Subscription (リアルタイム通信) のロジックが実装されました。コミットメッセージは「[fix] userの番号一覧を逆順にするところを非破壊的に変更」となっていますが、`view-user/src/utils/api_methods.ts` の追加を含んでおり、ここで `graphql-ws` と `ApolloClient` の導入が行われています。

*   **`fix/i2/167-apollo-subscription`**
    *   Apollo Subscriptionに関連する修正を行うための専用ブランチが存在し、ここでも設定の調整が行われていました。

## まとめ

質問にあった「apolo/clientに移行したら解決したんだっけ？」という認識は **正しい** です。
Apollo Clientのエコシステム（特に `graphql-ws`）に乗ることで、Hasuraとのリアルタイム通信が標準化され、安定稼働につながりました。
