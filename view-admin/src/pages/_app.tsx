import "@/styles/globals.css";
import type { AppProps } from "next/app";
import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
} from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { Flip, ToastContainer } from "react-toastify";

// ヘッダーに x-hasura-admin-secret を設定する
const wsClient = createClient({
  url: process.env.WS_API_URL + "/v1/graphql",
  connectionParams: {
    headers: {
      "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET,
    },
  },
});

// ヘッダーを含んだ websocket リンクを作成
const wsLink = new GraphQLWsLink(wsClient);

// HTTP リンク（query/mutation 用）: API_URI が未設定の場合は WS_API_URL から http(s) を推測してフォールバック
const resolveHttpGraphqlUri = () => {
  const apiBase = process.env.API_URI;
  if (apiBase) return apiBase.replace(/\/$/, "") + "/v1/graphql";
  const wsBase = process.env.WS_API_URL;
  if (wsBase) {
    try {
      const u = new URL(wsBase);
      u.protocol = u.protocol === "wss:" ? "https:" : "http:";
      u.pathname = "/v1/graphql";
      return u.toString();
    } catch (_) {
      // noop
    }
  }
  console.error(
    "[Apollo] API_URI が未設定で、WS_API_URL からのフォールバックにも失敗しました。/v1/graphql にフォールバックします。",
  );
  return "/v1/graphql";
};

const httpLink = new HttpLink({
  uri: resolveHttpGraphqlUri(),
  headers: {
    "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET as string,
  },
});

// subscription は WS、それ以外は HTTP
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink,
);

// Apollo client を作成
const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

export default function App({
  Component,
  pageProps: { session, ...pageProps },
  router,
}: AppProps) {
  useEffect(() => {
    if (!session) {
      router.push("/");
    }
  }, [router, session]);

  return (
    <>
      <ToastContainer
        toastClassName={"rounded-lg min-w-96 text-center"}
        position="bottom-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        transition={Flip}
      />
      <ApolloProvider client={client}>
        <SessionProvider session={session}>
          <Component {...pageProps} />
        </SessionProvider>
      </ApolloProvider>
    </>
  );
}
