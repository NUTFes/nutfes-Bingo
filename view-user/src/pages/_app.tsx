import "@/styles/reset.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
  HttpLink,
} from "@apollo/client";
import { createClient } from "graphql-ws";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { RecoilRoot } from "recoil";
import localFont from "next/font/local";
import { ResultChangeProvider } from "@/contexts/ResultChangeContext";

const silom = localFont({
  src: "../../public/fonts/Silom.ttf",
  variable: "--font-silom",
});

// ヘッダーにx-hasura-admin-secretを設定する
const wsClient = createClient({
  url: process.env.WS_API_URL + "/v1/graphql",
  connectionParams: {
    headers: {
      "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET,
    },
  },
});

// ヘッダーを含んだwebsocketリンクを作成
const wsLink = new GraphQLWsLink(wsClient);

// apollo clientを作成
const client = new ApolloClient({
  link: wsLink,
  cache: new InMemoryCache(),
});

// const inter = Inter({ subsets: ["latin"] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ApolloProvider client={client}>
      <RecoilRoot>
        <ResultChangeProvider>
          <main className={silom.className}>
            <Component {...pageProps} />
          </main>
        </ResultChangeProvider>
      </RecoilRoot>
    </ApolloProvider>
  );
}
