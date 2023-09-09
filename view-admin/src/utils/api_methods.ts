import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, gql } from "@apollo/client";
import { WebSocketLink } from "@apollo/client/link/ws";
import { SubscriptionClient } from "subscriptions-transport-ws";

// const httpLink = new HttpLink({
//   uri: "http://localhost:8080/v1/graphql"
// });

// const middlewareLink = new ApolloLink((operation, forward) => {
//   operation.setContext(({Headers = {} }) => ({
//     Headers: {
//       ...Headers,
//       "x-hasura-admin-secret": process.env.X_HASURA_ADMIN_SECRET,
//     }
//   }));

//   return forward(operation);
// });

const wsLink = new WebSocketLink(
  new SubscriptionClient(process.env.WS_API_URL + "/v1/graphql", {
    reconnect: true,
    connectionParams: {
      headers: {
        "x-hasura-admin-secret": process.env.X_HASURA_ADMIN_SECRET,
      },
    },
  })
);

// const wsLink = new WebSocketLink({
//   uri: process.env.WS_API_URL + "/v1/graphql",
//   options: {
//     reconnect: true,
//     connectionParams: {
//       headers: {
//         "x-hasura-admin-secret": process.env.X_HASURA_ADMIN_SECRET
//       }
//     }
//   },
//   reconnect: true,
// });

const client = new ApolloClient({
  link: wsLink,
  cache: new InMemoryCache(),
});
export interface BingoNumber {
  id: number;
  data: number;
}

export interface BingoPrize {
  id: number;
  name: string;
  existing: boolean;
  image: string;
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
    return [];
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
        next: (data) => resolve(data.data.bingo_number),
        error: (error) => {
          console.error("Subscription error:", error);
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error("Error fetching data:", error);
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
    return [];
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
    return [];
  }
}
export async function createBingoPrize(
  image: string
): Promise<string> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation MyMutation($image: String!) {
          insert_bingo_prize_one(object: {image: $image}) {
            id
          }
        }
      `,
      variables: { image },
    });
    return response.data.insert_bingo_prize_one;
  } catch (error) {
    console.error("Error creating bingo_prize image:", error);
    return ""
  }
}

export async function subscriptionBingoPrize(): Promise<BingoPrize[]> {
  try {
    const response = await client.subscribe({
      query: gql`
        subscription MySubscription {
          bingo_prize {
            image
            existing
            name
            id
          }
        }
      `,
    });
    return new Promise<BingoPrize[]>((resolve, reject) => {
      response.subscribe({
        next: response => resolve(response.data.bingo_prize),
        error: error => {
          console.error('Subscription error:', error);
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return[];
  }
}

// GraphQLクエリを実行
export async function getBingoPrize(): Promise<BingoPrize[]> {
  try {
    const response = await client.query({
      query: gql`
        query MyQuery {
          bingo_prize {
            image
            id
          }
        }
      `,
    });
    return response.data.bingo_prize;
  } catch (error) {
    console.error("Error fetching data:", error);
    return []
  }
}

export async function postBingoPrize(
  existing: boolean,
  image: string,
  name: string, 
): Promise<BingoPrize[]> {
  try {
    const response = await client.mutate({
      mutation: gql`
      mutation MyMutation($existing: Boolean!, $image: String!, $name: String!) {
        insert_bingo_prize(objects: {existing: $existing, image: $image, name: $name}) {
          returning {
            existing
            id
            image
            name
          }
        }
      }
    `,
    variables: { existing,image,name },
    });
    return response.data.insert_bingo_prize;
  } catch (error) {
    console.error("Error creating bingo prize:", error);
    return []
  }
}

export async function updatePrizeExisting(
  id: number,
  newExistingValue: boolean
): Promise<BingoPrize | null> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdateBingoPrize($id: Int!, $existing: Boolean!) {
          update_bingo_prize_by_pk(
            pk_columns: { id: $id }
            _set: { existing: $existing }
          ) {
            id
            name
            existing
            image
          }
        }
      `,
      variables: { id, existing: newExistingValue },
    });

    return response.data.update_bingo_prize_by_pk;
  } catch (error) {
    console.error("Error updating bingo prize:", error);
    return null;
  }
}