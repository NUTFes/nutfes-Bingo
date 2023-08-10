import { ApolloClient, InMemoryCache, gql} from "@apollo/client";
import next from "next/types";
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from "graphql-ws";
import { userAgent } from "next/server";

const wsLink = new GraphQLWsLink(createClient({
  url: process.env.WS_API_URL + "/v1/graphql",
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
    return new Promise<BingoNumber[]>((resolve, reject) => {
      response.subscribe({
        next: data => resolve(data.data.bingo_number),
        error: error => {
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
