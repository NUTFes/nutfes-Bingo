import { ApolloClient, InMemoryCache, gql} from "@apollo/client";
import next from "next/types";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from "graphql-ws";
import { userAgent } from "next/server";

const wsLink = new GraphQLWsLink(createClient({
  // ↓これつかえないの？？？
  // url: process.env.WS_API_URL + "/v1/graphql",
  url: "ws://localhost:8080" + "/v1/graphql",
    // 認証関連はここに書く
}));

const client = new ApolloClient({
  link: wsLink,
  cache: new InMemoryCache(),
});

export interface BingoNumber {
  id: number;
  data: number;
}

// GraphQLクエリを実行
export async function getBingoNumber(): Promise<BingoNumber[]> {
  try {
    const response = await client.query({
      query: gql`
        query MyQuery {
          bingo_number {
            data
            id
          }
        }
      `,
    });
    return response.data.bingo_number;
  } catch (error) {
    console.error("Error fetching data:", error);
    return []
  }
}

// websocket通信でBingoNumberを取得
export async function subscriptionBingoNumber(): Promise<BingoNumber[]> {
  try {
    const response = await client.subscribe({
      query: gql`
        subscription MySubscription {
          bingo_number {
            data
            id
          }
        }
      `,
    });
    // response は Observable なのでそのままでは返せない
    // 適切な方法で Observable を処理してデータを取得する必要がある

    // 例: Observable を Promise に変換して処理する
    return new Promise<BingoNumber[]>((resolve, reject) => {
      response.subscribe({
        next(data) {
          // データの処理
          // ここでは data.data.bingo_number を使ってデータを取得
          const bingoNumbers: BingoNumber[] = data.data.bingo_number;
          resolve(bingoNumbers);
        },
        error(error) {
          console.error('Subscription error:', error);
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}

export async function createBingoNumber(
  data: number
): Promise<BingoNumber[]> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation MyMutation($data: Int!) {
          insert_bingo_number_one(object: { data: $data }) {
            id
          }
        }
      `,
      variables: { data },
    });

    return response.data.insert_bingo_number_one;
  } catch (error) {
    console.error("Error creating bingo number:", error);
    return []
  }
}

export async function deleteBingoNumber(
  data: number
): Promise<BingoNumber[]> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation MyMutation($data: Int!) {
          delete_bingo_number(where: { data: { _eq: $data } }) {
            affected_rows
          }
        }
      `,
      variables: { data },
    });

    return response.data.delete_bingo_number;
  } catch (error) {
    console.error("Error deleteing bingo number:", error);
    return []
  }
}
