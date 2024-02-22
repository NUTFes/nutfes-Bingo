import '@/styles/reset.css'
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Inter } from 'next/font/google'
import { ApolloProvider, ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'
import { createClient } from 'graphql-ws'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'

// ヘッダーにx-hasura-admin-secretを設定する
const wsClient = createClient({
  url: process.env.WS_API_URL + '/v1/graphql',
  connectionParams: {
    headers: {
      'x-hasura-admin-secret': process.env.X_HASURA_ADMIN_SECRET
    }
  },
});

// ヘッダーを含んだwebsocketリンクを作成
const wsLink = new GraphQLWsLink(wsClient);

// apollo clientを作成
const client = new ApolloClient({
  link: wsLink,
  cache: new InMemoryCache(),
});

const inter = Inter({ subsets: ['latin'] })

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ApolloProvider client={client}>
      <Component {...pageProps} />
    </ApolloProvider>
  );
}
