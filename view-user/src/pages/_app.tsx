import "@/styles/reset.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { ApolloProvider, ApolloClient, InMemoryCache } from "@apollo/client";
import { createClient } from "graphql-ws";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { RecoilRoot, useSetRecoilState } from "recoil";
import { languageState } from "@/state/language";
import localFont from "next/font/local";

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

const LanguageSync: React.FC = () => {
  const { locale } = useRouter();
  const setLanguage = useSetRecoilState(languageState);

  useEffect(() => {
    setLanguage((locale as "ja" | "en") || "ja");
  }, [locale, setLanguage]);

  return null;
};

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ApolloProvider client={client}>
      <RecoilRoot>
        <LanguageSync />
        <main className={silom.className}>
          <Component {...pageProps} />
        </main>
      </RecoilRoot>
    </ApolloProvider>
  );
}
